# Voice and tone

Captures the dev's writing voice for vimyasa, with examples and
rules-of-thumb. **Use this when writing or reviewing user-visible
copy** — error messages, tooltips, settings labels, release notes,
README text — so the project's voice stays consistent even as
multiple Claude sessions ship copy across versions.

This doc is descriptive, not prescriptive — captured by reading
existing copy patterns rather than imposing a brand guide. Update
when patterns shift; the voice will evolve as the project grows.

---

## The two registers

Vimyasa has **two distinct voice registers** that shouldn't be
confused.

### 1. In-app copy (UI strings, error messages, settings labels)

**More restrained.** Direct, casual, friendly, but sober. No emoji.
Short sentences. Practical.

**Examples (shipped):**

- *"Message sent. Thanks!"* (success)
- *"Damn okay, over-achiever — you hit the 30-message daily limit (I
  had to put a cap on this to prevent spam attacks). The limit
  resets at midnight your time. If it's urgent, adjust your personal
  limits in Settings/Feedback."* (rate-limit error — note: the most
  expressive in-app copy in the project; still no emoji)
- *"Send failed (network error). Try again in a minute. If it keeps
  failing, hit me up at justin@taesongkim.com. Thanks!"* (network
  error)
- *"Note to Justin"* (feedback window header — direct, no
  formality)

**Patterns:**

- "Hit me up at" instead of "contact"
- "Thanks!" as a sign-off when appropriate
- Parentheticals for context ("(I had to put a cap on this…)")
- Direct address — "you," not "the user"
- Short forms — "30-message daily limit," not "your daily message
  quota of thirty"
- Acknowledge the user's effort or context — "over-achiever" instead
  of just "you've reached the limit"

### 2. Release notes and external copy (GitHub Releases, README)

**More personal and excited.** Emojis (✨ ♡) appear in release notes.
Bigger emotional range. The dev sounds like he's writing to friends
because he is.

**Examples (shipped):**

- *"A TON of quality of life polish, from better visual cues to
  snappier movements. Also a surprise visual treat ✨"* (v0.1.4
  intro)
- *"This is my first step toward my vision of building apps that
  work tightly and feel magical."* (v0.1.4 Theme 1 intro)
- *"(These will eventually be pay-to-keep features — free for my
  testers though ♡ thanks guys)"* (v0.1.4)
- *"Sorry to anyone who got used to inverse! Included an easy
  toggle, if you're attached to the reverse."* (v0.1.2)
- *"way, way, way faster"* (v0.1.4)
- *"Text me if you hit a bug or ideas!"* (v0.1.0)
- *"This is more of a note to self. Not relevant to regular users."*
  (v0.1.2 self-aware aside about a build-system fix)

**Patterns:**

- Emojis welcome in moderation: ✨ for delight, ♡ for warmth, no
  general-purpose smiley use
- Light hyperbole for emotional emphasis ("way, way, way faster")
- Self-aware honesty in parentheticals
- Casual sign-offs and direct address ("thanks guys," "Text me")
- Emotional acknowledgement of the user's experience (apologies
  when changing defaults, gratitude to testers)

---

## Universal rules

Apply across both registers:

1. **Direct address.** "You," not "the user" or "users." Even in
   release notes.
2. **No corporate-speak.** Avoid: "leverage," "robust,"
   "streamline," "best-in-class," "enhanced," "improved" (when used
   alone — say what specifically improved). Avoid the passive voice
   when the active is short.
3. **Em-dashes are fine.** They're a real part of the voice. So are
   parentheticals.
4. **Honesty about decisions and tradeoffs** is preferred over
   marketing language. "We had to put a cap on this" reads better
   than "for your security."
5. **Acknowledge constraints when imposing them.** Rate-limit copy
   apologizes; default-flip copy in v0.1.2 apologizes; no copy
   pretends a constraint is a feature.
6. **Specific over generic.** "30-message daily limit" beats "daily
   message limit." "Sliced down even thinner" beats "improved
   performance." Numbers and concrete language land harder.
7. **Friends-and-family register, not enterprise.** Vimyasa is a
   small project shared with people the dev knows. The copy should
   feel like that, not like SaaS marketing.

---

## Things to avoid

- Emoji in in-app copy (in release notes, fine in moderation)
- "We're excited to announce" or any variant
- "Reach out to support" — there's no support team; it's the dev
- Apologizing performatively when no apology is warranted ("Sorry
  for the inconvenience" when nothing inconvenient happened)
- Generic verbs that could apply to any feature (use specific ones)
- Long compound sentences when two short ones work
- Forcing branding language ("the Vimyasa experience," etc.)

---

## Writing for AI assistants writing for vimyasa

If you're a Claude session generating copy for vimyasa, two small
tells that help match voice:

1. **Default to under-decorated.** Strip a draft of one
   exclamation mark, one emoji, one adverb — almost always reads
   better.
2. **The dev's voice has restraint.** Even the most expressive
   shipped copy ("Damn okay, over-achiever") is one beat of
   personality wrapped in otherwise practical text. Don't pile on.

When in doubt, propose 2–3 copy candidates with labels (per the
"copy decisions upstream" pattern) and let the dev pick or remix.
He has strong opinions and good instincts about voice; trust him to
land the final word.

---

## Voice changes over time

The voice will evolve as vimyasa moves from friends-and-family
toward broader distribution (if it ever does). When that shift
happens — likely around v0.2.0 or v0.3.0 — this doc gets a major
revision. Until then, **this is the voice.**

Patterns this doc captures based on copy through v0.1.5. Update
liberally as new patterns emerge.
