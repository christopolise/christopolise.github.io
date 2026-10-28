---
title: 'SSS: Building a Seven Segment Sign'
authors: <b>Christopher Kitras*</b>, Ashton Palacios*, Philip Lundrigan
venue: PyCon US 2023, poster and demo
year: 2023
awards:
- First place, BYU IoT Pi Competition
figure: assets/sss.svg
link: assets/SSS_poster.pdf
links:
- text: Docs
  url: https://sss.readthedocs.io/en/latest/
  note: Hardware, API reference, and tutorials
- text: Code
  url: https://github.com/NET-BYU/sss
  note: Open source on GitHub, with a desktop simulator
- text: <b>Press Coverage</b>
  url: https://sss.readthedocs.io/en/latest/News/SSS%20in%20the%20Wild/
  note: Hackaday, Reddit, and others on Doom running on the sign
- text: Demo
  url: https://www.youtube.com/watch?v=BMf6OrbfOOQ&t=258s
  note: Video of the sign in action
first_author: true
link_label: Poster
fig: sss-pixels
fig_aspect: 16/9
fig_label: A grid of 16 by 6 seven-segment digits, one panel of the sign, draws a ring pixel by pixel. A zoomed-in digit shows that each digit is two pixels and which segments the current pixel lights.
fig_caption: '<strong>One digit, two pixels.</strong> The grid is one panel of the sign: 16 × 6 digits, which the library treats as 16 × 12 pixels. As the shape is drawn, the zoomed digit on the left shows which half the current pixel is and the four segments it lights. Switch shapes to draw a wave. The shapes and drawing speed are made up for the figure.'
fig_illustrative: true
about: A sign made of 1,152 seven-segment digits in a 48 by 24 grid, driven by one Raspberry Pi and written entirely in Python. A scheduler loops demos for the lab until someone takes over from a phone or a game controller, and it plays games, videos and even Doom. It won first place at a BYU Raspberry Pi competition and was shown as a poster and live demo at PyCon US 2023.
---
