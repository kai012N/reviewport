---
"reviewport": minor
---

Add a **flashlight toggle** to the review panel header that turns the on-page highlight on/off. The green marking on a change (fill + outline) can cover the content you're verifying — toggle the light off to remove it entirely; reviewport still scrolls to each change and the panel still shows which one it is, so you can review without anything obscuring the page. The button is a fixed size (no reflow when toggled) and the preference is remembered per session in `localStorage`.
