---
title: "SSS: Building a Seven Segment Sign"
short_title: "SSS: Seven Segment Sign"
summary: "A sign made of 1,152 seven-segment digits, driven by a Raspberry Pi and written entirely in Python. It loops demos for the lab, lets anyone take over from a phone, and runs Doom."
authors: <b>Christopher Kitras*</b>, Ashton Palacios*, Philip Lundrigan
section: projects
kind: "Open source"
permalink: /projects/sss/
venue: "PyCon US 2023, poster and demo"
venue_short: "PyCon 2023"
bib_venue: "PyCon US"
year: 2023
awards: ["First place, BYU IoT Pi Competition"]
figure: assets/sss.svg
link: assets/SSS_poster.pdf
link_label: "View the poster"
links:
  - text: "Docs"
    url: "https://sss.readthedocs.io/en/latest/"
    note: "Hardware, API reference, and tutorials"
  - text: "Code"
    url: "https://github.com/NET-BYU/sss"
    note: "Open source on GitHub, with a desktop simulator"
  - text: "<b>Press Coverage</b>"
    url: "https://sss.readthedocs.io/en/latest/News/SSS%20in%20the%20Wild/"
    note: "Hackaday, Reddit, and others on Doom running on the sign"
  - text: "Demo"
    url: "https://www.youtube.com/watch?v=BMf6OrbfOOQ&t=258s"
    note: "Video of the sign in action"
fig_scripts: [sss-pixels, sss-kiosk]
short:
  - label: "The goal"
    text: "Turn seven-segment displays, a familiar and boring part, into an interactive sign for our lab that a new Python programmer can write games for."
  - label: "What we built"
    text: "A 48 by 24 grid of digits driven by one Raspberry Pi, a Python library that hides the hardware, and a scheduler that loops demos until someone takes over from a web app or a game controller."
  - label: "How it went"
    text: "It plays games, videos, and even Doom. It won first place at a BYU Raspberry Pi competition, was shown as a poster and live demo at PyCon US 2023, and was covered by Hackaday."
---

## Something familiar, made remarkable

Seven-segment displays are about as plain as electronics get: seven bars that light up to form a digit. The Seven Segment Sign (SSS) started as an interactive display for the NET Lab and a question of how far that plain part could be pushed. I helped build it, and Ashton Palacios and I represented the original team of contributors when it went to competition.

<aside>* In the author list, an asterisk marks equal contribution: Christopher Kitras and Ashton Palacios contributed equally.</aside>

The sign is 1,152 seven-segment digits in a 48 by 24 grid, driven by a single Raspberry Pi and written entirely in Python. It has two jobs. Left alone, it loops through demos. When someone walks up, they can interrupt it from a web app on their phone or from a game controller and play.

The project has a second goal: to be easy to program. A Python library hides every hardware detail, so a developer new to Python can write a demo for the sign without knowing how it is wired, and test it in a desktop simulator without having the sign at all.

## The hardware

The sign is built from twelve identical panels, each a grid of 16 by 6 digits, so 96 digits per panel. On the back of each panel, twelve MAX7219 LED drivers each control eight digits. The drivers are chained: the data line from the Pi enters the first one, and each passes it on to the next.

All twelve panels hang off one Raspberry Pi 4B over SPI, the Pi's serial bus for peripherals. SPI selects which device is listening with a dedicated chip-select line, and the Pi's bus offers only one or two of them. To give each panel its own, we wrote a device tree overlay, a boot-time configuration file that reassigns ordinary GPIO pins as extra chip selects. Power comes from a 5 V supply rated at about 10 A.

<aside>The documentation is candid about the hardware's flaws: long, thin data and clock traces on the panels pick up noise, which is why each panel is now cabled directly to the power board instead of to its neighbor.</aside>

<dl class="results">
  <div><dt>seven-segment digits, in a 48 × 24 grid</dt><dd>1,152</dd></div>
  <div><dt>panels of 16 × 6 digits</dt><dd>12</dd></div>
  <div><dt>Raspberry Pi driving all of it</dt><dd>1</dd></div>
</dl>

## Drawing with segments

A seven-segment digit is not a pixel, so the display library has to decide what drawing on the sign means. It treats each digit as two stacked pixels. The top pixel's four sides are the top bar, the two upper side bars, and the middle bar; the bottom pixel's are the middle bar, the two lower side bars, and the bottom bar. The middle bar belongs to both.

A program can then light any combination of a pixel's four sides. Drawing a horizontal line lights one side of every pixel in a row; a filled pixel lights all four. The library tracks which digits changed and pushes only those to the panels, and the same calls can draw to the physical sign or to a simulated screen on a laptop.

{% include fig.html id="sss-pixels" aspect="16/9" illustrative=true label="A grid of 16 by 6 seven-segment digits, one panel of the sign, draws a ring pixel by pixel. A zoomed-in digit shows that each digit is two pixels and which segments the current pixel lights." caption="<strong>One digit, two pixels.</strong> The grid is one panel of the sign: 16 × 6 digits, which the library treats as 16 × 12 pixels. As the shape is drawn, the zoomed digit on the left shows which half the current pixel is and the four segments it lights. Switch shapes to draw a wave. The shapes and drawing speed are made up for the figure." %}

## A scheduler built on generators

The software's core is a scheduler built on Python generators. Each demo is a generator function with two settings: a frame rate, which tells the scheduler how often to produce a frame, and a run time, which says how long the demo should play. On each tick, the scheduler calls the demo's generator once. The demo does one small piece of work, draws one frame, and yields control back.

The scheduler treats every subsystem the same way: it calls each one's run or tick function, which performs one quick action and yields. Input and output travel between subsystems through queues:

- **Controllers** feed input to a demo, from a physical game controller to a web app on a phone.
- **Broadcasters** send the sign's output to other services over the Internet.
- **The display library** receives each frame and draws it.

In kiosk mode, the scheduler loops through the demos with no one at the controls. At any moment a user can interrupt from the web app and switch to a different demo or game.

{% include fig.html id="sss-kiosk" aspect="16/9" illustrative=true label="A slice of the sign loops through a text demo, a ball demo, and a wave demo while a scheduler panel shows each demo's progress. A request from a phone arrives and the scheduler switches to a game." caption="<strong>Kiosk mode and a takeover.</strong> The scheduler loops through demos, calling the active one once per frame (the light beside the title). A request from the phone's web app crosses the input queue, the loop pauses, and the game takes over until its run time ends. Press the button to send another request. The sign shown is a slice of the real 48 × 24 grid, and the demos, frame rates, and run times are made up." %}

## Doom, and a first place

The team built several games and demos on top of the library and scheduler, including a video player and a port of Doom. Doom on a screen of seven-segment digits is what brought outside attention: Hackaday and Reddit picked it up, along with sites in other languages, and they are collected on the Press Coverage page.

The sign took first place at a BYU Raspberry Pi competition, where the pitch was its practical, educational, and IoT value. In 2023 we brought it to PyCon US as a poster and a live demo.

## Open to anyone

The code, the panel blueprints, and the simulator are all public. The repository accepts outside demos through pull requests, with two rules that keep it maintainable: the code must be formatted with `black`, and a change needs approval from two members of the lab's organization. The documentation walks a newcomer from installing the simulator to writing a first demo.

What I take from it is that a strict limit makes a good teaching tool. A screen made of digits forces every demo to answer the question of what drawing even means here, and the library answers most of it so that a beginner doesn't have to.
