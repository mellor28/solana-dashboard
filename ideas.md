# Solana Dashboard — Design Brainstorm

<response>
<idea>
**Design Movement**: Cyberpunk Terminal / Dark Data Observatory

**Core Principles**:
1. Data-first hierarchy — every element serves information density
2. Neon accent on deep void backgrounds — high contrast, low fatigue
3. Monospaced data values paired with humanist labels
4. Grid lines as structural decoration, not just layout

**Color Philosophy**:
Inspired by Solana's brand gradient (purple → teal), but pushed into a terminal aesthetic.
Deep navy-black base (#0a0e1a), with Solana's signature green-teal (#14F195) as primary accent,
and electric purple (#9945FF) as secondary. Data goes green, alerts go amber.

**Layout Paradigm**:
Asymmetric dashboard grid — left sidebar for navigation, main content in a 3-column bento grid.
Cards have sharp corners with a subtle 1px neon border glow. No rounded pill shapes.

**Signature Elements**:
1. Scanline texture overlay at 3% opacity across all cards
2. Animated gradient border on the hero SOL price card
3. Monospaced number counters with tick animations

**Interaction Philosophy**:
Hover states reveal hidden data layers. Charts animate on scroll-into-view.
Numbers count up on load. Everything feels like a live terminal feed.

**Animation**:
- Numbers: count-up animation on mount (0 → value over 800ms)
- Charts: draw-in from left on first render
- Cards: subtle pulse on data refresh
- Sidebar: smooth slide with blur backdrop

**Typography System**:
- Display/Numbers: JetBrains Mono (monospaced, technical authority)
- Labels/UI: Space Grotesk (geometric, modern, distinct from Inter)
- Hierarchy: 48px display → 24px heading → 14px label → 12px caption
</idea>
<probability>0.08</probability>
</response>

<response>
<idea>
**Design Movement**: Brutalist Financial Terminal

**Core Principles**:
1. Raw information density — no decorative chrome
2. Heavy typographic contrast — thick strokes vs hairlines
3. Stark black/white with single accent color (Solana green)
4. Deliberate misalignment as a design choice

**Color Philosophy**:
Near-black (#111) background, pure white text, Solana green (#14F195) for positive values only.
Red (#FF4444) for negative. No gradients, no blur, no shadows.

**Layout Paradigm**:
Newspaper-style column layout. Data tables dominate. Charts are secondary.
Thick horizontal rules divide sections. No cards — just raw sections.

**Signature Elements**:
1. Bold uppercase section headers with tracking
2. Raw data tables with alternating row shading
3. Large typographic price display (96px)

**Interaction Philosophy**:
No hover animations. Data updates flash briefly. Minimal motion.
The interface should feel like a Bloomberg terminal.

**Animation**:
- Price changes: flash white → settle
- No entrance animations
- Instant transitions

**Typography System**:
- Everything: IBM Plex Mono
- Hierarchy through weight and size only
</idea>
<probability>0.05</probability>
</response>

<response>
<idea>
**Design Movement**: Glassmorphic Space Dashboard / Deep Space Observatory

**Core Principles**:
1. Depth through layered glass panels — frosted cards floating over cosmic background
2. Solana's purple-teal gradient as the living background
3. Soft luminosity — glowing data points, not harsh neon
4. Generous whitespace within cards, tight information density between them

**Color Philosophy**:
Deep space background (#06091a → #0d1b3e gradient), glass cards with 15% white fill and backdrop blur.
Solana green (#14F195) for positive metrics, soft purple (#9945FF) for secondary data.
White text on glass, never black. Charts use a purple → teal gradient fill.

**Layout Paradigm**:
Top navigation bar with logo. Main content in a responsive bento grid (2-3 columns).
Hero section spans full width with the SOL price prominently displayed.
Staking section gets its own dedicated full-width panel at the bottom.

**Signature Elements**:
1. Animated star/particle background that slowly drifts
2. Glass cards with colored top-border accent (green for gains, purple for neutral)
3. Gradient area charts that mirror the space color palette

**Interaction Philosophy**:
Smooth hover lifts on cards (translateY -4px + shadow increase).
Charts animate smoothly on data load. Refresh button spins with a glow effect.
Tooltips appear as frosted glass overlays.

**Animation**:
- Page load: cards fade-in staggered (50ms delay each)
- Numbers: smooth count-up over 1.2s with easing
- Charts: area fill animates from bottom up
- Background: slow 60s particle drift loop

**Typography System**:
- Display/Numbers: Space Mono (technical, spacey)
- UI/Labels: DM Sans (clean, readable, not Inter)
- Hierarchy: 56px hero price → 28px section heads → 16px labels → 13px captions
</idea>
<probability>0.09</probability>
</response>

## Selected Design: Glassmorphic Space Dashboard

Deep space background with glass morphism cards. Solana's purple-teal gradient as the living background.
Space Mono for numbers, DM Sans for UI text. Animated particle background, smooth card hover lifts,
and gradient area charts. This approach gives the dashboard a premium, futuristic feel that matches
Solana's brand identity while remaining highly readable for daily use.
