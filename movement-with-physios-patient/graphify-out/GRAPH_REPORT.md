# Graph Report - .  (2026-04-19)

## Corpus Check
- Corpus is ~27,633 words - fits in a single context window. You may not need a graph.

## Summary
- 139 nodes · 275 edges · 16 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Booking & Auth Screens|Booking & Auth Screens]]
- [[_COMMUNITY_Onboarding Flow|Onboarding Flow]]
- [[_COMMUNITY_Chat & Messaging Service|Chat & Messaging Service]]
- [[_COMMUNITY_Tab Navigation & Icons|Tab Navigation & Icons]]
- [[_COMMUNITY_Chat UI Components|Chat UI Components]]
- [[_COMMUNITY_App Entry & Context|App Entry & Context]]
- [[_COMMUNITY_Main Navigation Stacks|Main Navigation Stacks]]
- [[_COMMUNITY_Button Components|Button Components]]
- [[_COMMUNITY_Conversation List|Conversation List]]
- [[_COMMUNITY_Therapist Card|Therapist Card]]
- [[_COMMUNITY_Clerk Auth|Clerk Auth]]
- [[_COMMUNITY_Profile Screen|Profile Screen]]
- [[_COMMUNITY_Progress Screen|Progress Screen]]
- [[_COMMUNITY_Font Constants|Font Constants]]
- [[_COMMUNITY_Color Constants|Color Constants]]
- [[_COMMUNITY_Route Constants|Route Constants]]

## God Nodes (most connected - your core abstractions)
1. `fonts` - 21 edges
2. `colors` - 21 edges
3. `PATIENT_ROUTES` - 20 edges
4. `OnboardingShell()` - 15 edges
5. `ChatRoomScreen()` - 14 edges
6. `HomeScreen()` - 14 edges
7. `MainNavigator()` - 10 edges
8. `MessagesScreen()` - 10 edges
9. `chatService` - 10 edges
10. `useOnboarding()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `OnboardingShell()` --conceptually_related_to--> `OnboardingContextPattern`  [INFERRED]
  src/components/auth/OnboardingShell.jsx → ONBOARDING_PLAN.md
- `AnimatedTabBar()` --implements--> `TabBarAbsolutePositionPattern`  [INFERRED]
  src/components/navigation/AnimatedTabBar.jsx → CLAUDE.md
- `CLAUDEMdProjectReference` --references--> `AttachmentSheet()`  [EXTRACTED]
  CLAUDE.md → src/components/chat/AttachmentSheet.jsx
- `CLAUDEMdProjectReference` --references--> `OnboardingShell()`  [EXTRACTED]
  CLAUDE.md → src/components/auth/OnboardingShell.jsx
- `CLAUDEMdProjectReference` --references--> `chatService`  [EXTRACTED]
  CLAUDE.md → src/services/chatService.js

## Hyperedges (group relationships)
- **Onboarding Screen Flow** — loginscreen_loginscreen, personalinfoscreen_personalinfoscreen, painlocationscreen_painlocationscreen, painseverityscreen_painseverityscreen, paindurationscreen_paindurationscreen, recoverygoalsscreen_recoverygoalsscreen, availabilityscreen_availabilityscreen, onboardingcompletescreen_onboardingcompletescreen [INFERRED]
- **Booking Flow** — booktherapistscreen_booktherapistscreen, slotselectionscreen_slotselectionscreen, bookingconfirmedscreen_bookingconfirmedscreen [INFERRED]
- **Main Tab Screens** — homescreen_homescreen, booktherapistscreen_booktherapistscreen, progressscreen_progressscreen, profilescreen_profilescreen [INFERRED]
- **ChatFeatureComponents** —  [INFERRED]
- **OnboardingUIComponents** —  [INFERRED]
- **NavigationComponents** —  [INFERRED]

## Communities

### Community 0 - "Booking & Auth Screens"
Cohesion: 0.13
Nodes (20): AuthNavigator(), BookingConfirmedScreen(), BookScreen(), BookTherapistScreen(), ClerkAuthScreen(), colors, fonts, CircularRing() (+12 more)

### Community 1 - "Onboarding Flow"
Cohesion: 0.13
Nodes (15): AvailabilityScreen(), OnboardingContextPattern, submitOnboarding(), MWPOnboardingTaskSpec, OnboardingFlowPlan, OnboardingProvider(), useOnboarding(), OnboardingShell() (+7 more)

### Community 2 - "Chat & Messaging Service"
Cohesion: 0.2
Nodes (13): ChatRoomScreen(), getInitials(), chatService, _delay(), getConversations(), getMessages(), getTypingStatus(), markAsRead() (+5 more)

### Community 3 - "Tab Navigation & Icons"
Cohesion: 0.23
Nodes (9): AchievementIcon(), FlameIcon(), StarIcon(), TrophyIcon(), AnimatedTabBar(), CenterTabButton(), CLAUDEMdProjectReference, TabBarAbsolutePositionPattern (+1 more)

### Community 4 - "Chat UI Components"
Cohesion: 0.23
Nodes (8): AnimatedSheet(), AttachmentSheet(), ComposerBar(), formatBubbleTime(), InlineReplyStrip(), MessageBubble(), ReadReceipt(), ReplyPreview()

### Community 5 - "App Entry & Context"
Cohesion: 0.31
Nodes (5): App(), AppNavigator(), PatientProvider(), usePatient(), RootNavigator()

### Community 6 - "Main Navigation Stacks"
Cohesion: 0.38
Nodes (4): BookStack(), HomeStack(), isTabBarHidden(), MainNavigator()

### Community 7 - "Button Components"
Cohesion: 0.5
Nodes (2): OutlineButton(), PrimaryButton()

### Community 8 - "Conversation List"
Cohesion: 0.83
Nodes (3): ConversationRow(), formatTime(), getInitials()

### Community 9 - "Therapist Card"
Cohesion: 1.0
Nodes (2): Star(), TherapistCard()

### Community 10 - "Clerk Auth"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Profile Screen"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Progress Screen"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Font Constants"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Color Constants"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Route Constants"
Cohesion: 1.0
Nodes (0): 

## Ambiguous Edges - Review These
- `MainNavigator()` → `MainNavigator()`  [AMBIGUOUS]
  src/navigation/MainNavigator.jsx · relation: conceptually_related_to

## Knowledge Gaps
- **Thin community `Clerk Auth`** (2 nodes): `ClerkAuthScreen()`, `AuthNavigator.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Screen`** (2 nodes): `MenuRow()`, `ProfileScreen.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress Screen`** (2 nodes): `DotLegendItem()`, `ProgressScreen.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Font Constants`** (1 nodes): `fonts.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Color Constants`** (1 nodes): `colors.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Route Constants`** (1 nodes): `routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MainNavigator()` and `MainNavigator()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `ChatRoomScreen()` connect `Chat & Messaging Service` to `Booking & Auth Screens`, `Chat UI Components`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `fonts` connect `Booking & Auth Screens` to `Onboarding Flow`, `Chat & Messaging Service`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Why does `colors` connect `Booking & Auth Screens` to `Onboarding Flow`, `Chat & Messaging Service`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `OnboardingShell()` (e.g. with `SelectablePill()` and `SelectableCard()`) actually correct?**
  _`OnboardingShell()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ChatRoomScreen()` (e.g. with `getMessages()` and `markAsRead()`) actually correct?**
  _`ChatRoomScreen()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Booking & Auth Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._