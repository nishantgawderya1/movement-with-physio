# Graph Report - .  (2026-05-16)

## Corpus Check
- Corpus is ~41,119 words - fits in a single context window. You may not need a graph.

## Summary
- 144 nodes · 188 edges · 25 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 1% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `PATIENT_ROUTES` - 14 edges
2. `fonts` - 11 edges
3. `colors` - 11 edges
4. `MainNavigator()` - 9 edges
5. `OnboardingShell()` - 9 edges
6. `HomeScreen()` - 8 edges
7. `AvailabilityScreen()` - 7 edges
8. `PainSeverityScreen()` - 7 edges
9. `RecoveryGoalsScreen()` - 6 edges
10. `PainDurationScreen()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `PrimaryButton()` --conceptually_related_to--> `OnboardingShell()`  [INFERRED]
  src/components/ui/PrimaryButton.jsx → src/components/auth/OnboardingShell.jsx
- `SelectablePill()` --conceptually_related_to--> `OnboardingShell()`  [INFERRED]
  src/components/auth/SelectablePill.jsx → src/components/auth/OnboardingShell.jsx
- `TabScreenWrapper()` --conceptually_related_to--> `AnimatedTabBar()`  [INFERRED]
  src/components/navigation/TabScreenWrapper.jsx → src/components/navigation/AnimatedTabBar.jsx
- `SplashScreen()` --references--> `PATIENT_ROUTES`  [EXTRACTED]
  src/screens/splash/SplashScreen.jsx → src/constants/routes.js
- `TreatmentHistoryScreen()` --calls--> `OnboardingShell()`  [EXTRACTED]
  src/screens/auth/TreatmentHistoryScreen.jsx → src/components/auth/OnboardingShell.jsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (21): ChatRoomScreen(), getInitials(), createRoom(), getConversations(), getMessages(), getTypingStatus(), markAsRead(), normalizeMessage() (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (11): BookingConfirmedScreen(), BookScreen(), colors, fonts, CircularRing(), HomeScreen(), ProgressScreen(), SlotSelectionScreen() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (8): AvailabilityScreen(), submitOnboarding(), OnboardingShell(), PainDurationScreen(), PainLocationScreen(), PainSeverityScreen(), RecoveryGoalsScreen(), SelectablePill()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (8): AnimatedTabBar(), BookStack(), CenterTabButton(), HomeStack(), isTabBarHidden(), MainNavigator(), MessagesStack(), PATIENT_ROUTES

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (7): AppNavigator, OnboardingCompleteScreen(), PatientProvider(), usePatient(), getInitials(), ProfileScreen(), RootNavigator()

### Community 5 - "Community 5"
Cohesion: 0.7
Nodes (4): AchievementIcon(), FlameIcon(), StarIcon(), TrophyIcon()

### Community 6 - "Community 6"
Cohesion: 0.7
Nodes (4): formatBubbleTime(), InlineReplyStrip(), MessageBubble(), ReadReceipt()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): OutlineButton(), PrimaryButton()

### Community 8 - "Community 8"
Cohesion: 0.83
Nodes (3): ConversationRow(), formatTime(), getInitials()

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (3): OnboardingProvider, useOnboarding, PersonalInfoScreen()

### Community 10 - "Community 10"
Cohesion: 0.83
Nodes (3): buildUrl(), request(), withQuery()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): AnimatedSheet(), AttachmentSheet()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): Star(), TherapistCard()

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (3): CountdownRing, SessionCompleteView, SessionScreen

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): SelectableCard

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

## Ambiguous Edges - Review These
- `MainNavigator()` → `MainNavigator()`  [AMBIGUOUS]
  src/navigation/MainNavigator.jsx · relation: conceptually_related_to

## Knowledge Gaps
- **6 isolated node(s):** `OnboardingProvider`, `SessionCompleteView`, `CountdownRing`, `ReplyPreview`, `TypingIndicator` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (2 nodes): `App()`, `App.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `AuthNavigator()`, `AuthNavigator.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `ClerkAuthScreen()`, `ClerkAuthScreen.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `LoginScreen()`, `LoginScreen.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `fonts.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `colors.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `routes.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `SelectableCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `reactDomStub.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MainNavigator()` and `MainNavigator()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `PATIENT_ROUTES` connect `Community 3` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `ProgressScreen()` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `OnboardingShell()` connect `Community 2` to `Community 1`, `Community 7`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `OnboardingShell()` (e.g. with `PrimaryButton()` and `SelectablePill()`) actually correct?**
  _`OnboardingShell()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `OnboardingProvider`, `SessionCompleteView`, `CountdownRing` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._