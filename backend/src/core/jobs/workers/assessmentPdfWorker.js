'use strict';

const PDFDocument = require('pdfkit');
const logger = require('../../utils/logger');
const { getStorage } = require('../../storage');
const { JOB_NAMES, NOTIFICATION_TYPES } = require('../../utils/constants');
const { addJob } = require('../jobQueue');
const Assessment = require('../../../models/Assessment.model');
const User = require('../../../models/User.model');
const env = require('../../../config/env');

/**
 * Render a clinical-assessment PDF as a Buffer.
 * Exported for tests — has no I/O of its own.
 *
 * @param {object} assessment - lean or full document
 * @param {object} patient
 * @param {object|null} therapist
 * @returns {Promise<Buffer>}
 */
async function buildPdfBuffer(assessment, patient, therapist) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).text('Movement With Physios', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text('Clinical Assessment', { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#000');

    // Metadata
    doc.fontSize(11);
    doc.text(`Patient: ${patient?.name || 'Unknown'}`);
    doc.text(`Therapist: ${therapist?.name || 'Unknown'}`);
    doc.text(`Date: ${new Date(assessment.completedAt || assessment.createdAt).toISOString().split('T')[0]}`);
    doc.text(`Body Part: ${(assessment.bodyParts || []).join(', ') || '—'}`);
    doc.text(`Assessment ID: ${String(assessment._id)}`);
    doc.moveDown(1);

    // Q&A
    const responseByQ = new Map(
      (assessment.responses || []).map((r) => [r.questionId, r])
    );
    doc.fontSize(13).text('Questions & Responses');
    doc.moveDown(0.4);
    (assessment.questions || []).forEach((q, idx) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`Q${idx + 1}. ${q.questionText}`);
      doc.font('Helvetica');
      const resp = responseByQ.get(q.questionId);
      let ans;
      if (!resp) ans = '(no answer)';
      else if (resp.answer === null || resp.answer === undefined) ans = '(skipped)';
      else if (Array.isArray(resp.answer)) ans = resp.answer.join(', ');
      else ans = String(resp.answer);
      doc.text(`A: ${ans}`, { indent: 12 });
      doc.moveDown(0.3);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666')
      .text('Confidential clinical assessment — Movement With Physios', { align: 'center' });

    doc.end();
  });
}

/**
 * PDF handler — generates the assessment PDF, persists it via the storage
 * adapter, writes pdfKey + pdfGeneratedAt onto the Assessment, and enqueues
 * a follow-up notification to the therapist.
 *
 * Idempotent: bails immediately if pdfKey is already set.
 *
 * Now invoked by the unified worker (see unifiedWorker.js) — no longer
 * constructs its own BullMQ Worker.
 */
async function pdfHandler(job) {
  const { assessmentId } = job.data || {};
  if (!assessmentId) throw new Error('assessmentId missing in job data');

  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw new Error(`Assessment ${assessmentId} not found`);

  // Idempotency: bail if PDF already generated.
  if (assessment.pdfKey) {
    logger.info({ event: 'PDF_ALREADY_GENERATED', assessmentId });
    return;
  }

  const [patient, therapist] = await Promise.all([
    User.findById(assessment.patientId).select('name'),
    assessment.therapistId ? User.findById(assessment.therapistId).select('name') : null,
  ]);

  const buffer = await buildPdfBuffer(assessment, patient, therapist);
  const key = `${env.ASSESSMENT_PDF_PREFIX}${assessmentId}.pdf`;
  const storage = getStorage();
  await storage.putPdf(buffer, key, {
    contentDisposition: `attachment; filename="assessment-${assessmentId}.pdf"`,
  });

  assessment.pdfKey = key;
  assessment.pdfGeneratedAt = new Date();
  await assessment.save();

  // Notify therapist
  if (assessment.therapistId) {
    try {
      await addJob(JOB_NAMES.SEND_NOTIFICATION, {
        userId: String(assessment.therapistId),
        title: 'Assessment PDF Ready',
        body: 'The assessment PDF has been generated.',
        type: NOTIFICATION_TYPES.ASSESSMENT_COMPLETED,
        data: {
          assessmentId: String(assessment._id),
          bookingId: assessment.bookingId ? String(assessment.bookingId) : null,
        },
      });
    } catch (err) {
      logger.warn({ event: 'PDF_NOTIFICATION_ENQUEUE_FAILED', err: err.message });
    }
  }

  logger.info({ event: 'PDF_GENERATED', assessmentId, key });
}

module.exports = { pdfHandler, buildPdfBuffer };
