---
title:  "Sustainable Radon Mitigation through Optimized HVAC Scheduling"
short_title: "Radon HVAC scheduling"
summary: "Radon builds up in school buildings overnight, and conventional mitigation is too expensive for large, old buildings. This work uses the HVAC system a school already has, with a schedule derived from radon monitors, to clear the air before staff arrive while running the system less than before."
authors: <b>Christopher Kitras</b>, John D. Beard, James D. Johnston, Philip Lundrigan
venue: "ACM/IEEE International Conference on Connected Health: Applications, Systems and Engineering Technologies (CHASE), New York, 2025"
venue_short: "CHASE 2025"
bib_venue: "Proc. ACM/IEEE International Conference on Connected Health: Applications, Systems and Engineering Technologies (CHASE)"
year: 2025
area: airquality
first_author: true
featured: true
featured_order: 2
featured_fig: radon-hvac-slope
doi: 10.1145/3721201.3721398
figure: assets/rc.svg
link: assets/Radon.pdf
also_presented:
  - title: "Radon Mitigation through Optimized HVAC Scheduling (poster)"
    venue: "Air Quality: Science for Solutions 2024"
    award: "Best Poster Award"
    url: assets/S4S-2024.pdf
links:
  - text: "ACM"
    url: https://dl.acm.org/doi/10.1145/3721201.3721398
    note: "Published version, ACM Digital Library"
  - text: "Xplore"
    url: https://ieeexplore.ieee.org/document/11121074
    note: "Published version, IEEE Xplore"
  - text: "Presentation"
    url: assets/radon_presentation.pdf
    note: "CHASE 2025 talk slides"
fig_scripts: [radon-hvac-slope, radon-hvac-starts]
short:
  - label: "The problem"
    text: "Radon, a radioactive gas from the soil, collects in buildings overnight and is the second leading cause of lung cancer. Teachers can spend decades in affected rooms, and standard mitigation is too costly for large school buildings."
  - label: "The idea"
    text: "A school's ventilation system already swaps indoor air for outdoor air. Measure how fast it clears radon in each zone, then turn it on just early enough that radon is below the safe limit when staff arrive."
  - label: "The result"
    text: "Over most of a year in one elementary school, the derived schedules usually started the HVAC an hour or more later than the existing schedule and switched it off an hour sooner, while keeping occupied-hour radon below the EPA action level."
---

## Radon in schools

Radon is a radioactive gas released by minerals decaying in the soil. It seeps into buildings through cracks in the foundation, and because it has no color or smell, nobody notices it building up without special instruments. It is the second leading cause of lung cancer in the United States, and the World Health Organization attributes 3% to 14% of lung cancer cases worldwide to it.

Schools are a quiet worst case. The people most exposed are faculty and staff, who can spend whole careers in the same rooms, and many schools lack the budget even to test. The usual fixes, such as sub-slab depressurization (drilling into the floor slab and pulling the gas out through dedicated piping) or sealing every entry point, are reasonable for a house. For a large, older building with a complicated footprint they become prohibitively expensive, and without any feedback they can quietly stop working as radon levels creep back over the years.

<aside>Radon is measured in picocuries per liter (pCi/L). The U.S. EPA recommends action at 4 pCi/L.</aside>

The question here: **can a school bring radon down to a safe level using only equipment it already has, without paying for more runtime than it needs?**

## Use the HVAC that's already there

Every school already has a machine for exchanging indoor air with outdoor air: its heating, ventilation, and air-conditioning system. In occupied mode, the HVAC brings in fresh air zone by zone to keep CO<sub>2</sub> in check, and that same air exchange dilutes radon and carries it out. Radon builds up overnight and over weekends while the system sits in unoccupied mode, then falls once it turns on.

The naive way to use this is to run the HVAC longer. We tested that as the *extended* schedule: on an hour earlier and off an hour later, two extra hours every day. It certainly lowers radon, but it pays for runtime the building may not need. The goal instead was a schedule that runs only long enough to reach a target, here the EPA's 4 pCi/L, by the time people arrive, and that adapts to each zone, since radon is not spread evenly through a building.

Doing this needs hourly data. Passive radon tests (charcoal canisters, alpha-track detectors) report one average over days or months and can't show how fast radon accumulates or clears. Continuous radon monitors report every hour. I chose the SunRADON 1028XP as the monitor that balanced cost against what the system needed, and since it had no official client for its API, I wrote a Python client to pull its data.

## Finding the latest safe start time

The scheduling algorithm, which I formulated, starts from a two-week *control* period with the school's normal schedule: HVAC on at 06:00, off at 17:00, building occupied from 07:00 to 16:00. For each zone it averages the hourly radon readings by hour of day, separately for each day of the week, so a Monday after the weekend isn't blended with a Wednesday.

{% include fig.html id="radon-hvac-slope" aspect="16/9" illustrative=true label="A day of average radon in one zone. Radon rises overnight, falls after the HVAC turns on at 06:00, and a fitted decay line is slid later until it reaches 4 pCi/L at 07:00, giving a later HVAC start time." caption="<strong>Deriving the start time.</strong> Fit the decay after the HVAC turns on, slide that slope until it reaches the 4 pCi/L limit exactly when the school opens, and start the HVAC where the slid line meets the overnight build-up. Switch to Monday to see weekend accumulation push the start time earlier than the 06:00 control. The curve shape is synthetic; the limit and schedule times are the study's." %}

From each averaged day, the algorithm:

1. Crops the curve to the stretch between the HVAC turning on and radon dropping to the threshold.
2. Fits a straight line to that stretch. Its slope is how fast this HVAC zone clears radon.
3. Shifts the line, keeping its slope, until it reaches the threshold exactly at the occupied start time, 07:00.
4. Takes the point where the shifted line meets the overnight radon level as the new HVAC start time.

If radon in a zone never rises above the threshold, there is nothing to clear, and the HVAC can wait until the building opens. If radon builds up more than usual, as it does over a weekend, the line meets the curve earlier and the HVAC starts before the control time. The *optimized* schedule also switches the HVAC off at 16:00, when the building empties, rather than an hour later.

## A year in one school

We placed SunRADON 1028XP monitors, calibrated by the manufacturer and run through their burn-in period, in three HVAC zones of a Utah elementary school where staff spend most of their day. Zones 1 and 2 had shown high radon in an earlier study; Zone 3 had shown low levels and served as a control. Monitoring ran from 12 January to 20 December 2024, covering winter, spring, fall, and a second winter, because radon accumulates more as the weather turns cold. Summer was left out because the school is mostly empty.

Each season was split into three two-week periods: control, extended, then optimized. We had planned to drive the HVAC automatically through the building's control system, but the school administrators asked that it not be automated. So at the end of each period we collected the monitor data, computed the schedule, and asked the custodians to enter it by hand. The method itself only needs whatever access a building offers, whether an operator or an API.

## What it saved

{% include fig.html id="radon-hvac-starts" aspect="16/9" label="Optimized HVAC start times for three zones on each weekday, for one season at a time, compared with the 06:00 control start, the 05:00 extended start, and the 07:00 opening time." caption="<strong>Start times from the deployment.</strong> Each dot is one zone on one weekday. Dots begin at the 06:00 control start and move to the start time the algorithm derived. The column on the right adds up the time saved against 06:00. Start times are from Table 1 of the paper; the totals are computed from them. Use <em>Next season</em> to step through the year." %}

Almost every optimized start was later than 06:00, and many were 07:00: radon in those zones was already below the threshold by morning, so the HVAC could wait until the building opened. The exceptions were Mondays, when radon had been accumulating all weekend with the system off, and in a few cases the HVAC had to start earlier than the control schedule. The table reproduces the paper's totals: for each weekday and zone, the start time saved against the control schedule, added up over the four seasons.

<table>
  <thead><tr><th>Start time saved</th><th class="n">Zone 1</th><th class="n">Zone 2</th><th class="n">Zone 3</th></tr></thead>
  <tbody>
    <tr><th>Monday</th><td class="n">0:42</td><td class="n">−0:17</td><td class="n">4:00</td></tr>
    <tr><th>Tuesday</th><td class="n">3:23</td><td class="n">3:44</td><td class="n">4:00</td></tr>
    <tr><th>Wednesday</th><td class="n">2:37</td><td class="n">3:11</td><td class="n">4:00</td></tr>
    <tr><th>Thursday</th><td class="n">2:38</td><td class="n">4:00</td><td class="n">4:00</td></tr>
    <tr><th>Friday</th><td class="n">1:24</td><td class="n">4:00</td><td class="n">4:00</td></tr>
  </tbody>
</table>

Ending earlier also turned out to be free. To check whether switching off at 16:00 lets more radon build up overnight, and so forces an earlier start the next morning, we compared the average overnight peak in each monitored room under the extended and optimized schedules. The peaks were nearly the same, so ending when the building empties saves another hour of HVAC runtime per zone per day.

<dl class="results">
  <div><dt>radon target before staff arrive (EPA action level)</dt><dd>4 pCi/L</dd></div>
  <div><dt>extra HVAC runtime per day in the naive extended schedule</dt><dd>2 h</dd></div>
  <div><dt>runtime saved per zone per day by switching off at 16:00</dt><dd>1 h</dd></div>
  <div><dt>monitoring, across four seasons</dt><dd>Jan–Dec 2024</dd></div>
</dl>

On health, all three schedules kept average radon during occupied hours below the EPA threshold across the zones and seasons, while the overnight peaks with the HVAC off often climbed above it. Radon ran higher in the colder seasons, as other studies have found. With two weeks per schedule per season, the data can't say with confidence that one schedule clears radon better than another, so the claim is narrower: the optimized schedule protects occupants as well as the others while using the least HVAC time.

## What I'd take from it

Radon mitigation for a large building doesn't have to start with construction. The building already contains a ventilation system and, with a few monitors, enough data to decide when to run it. Because the schedule depends only on measured decay rates and the building's hours, the same method can move to another school and can be automated wherever the HVAC exposes a control interface. One practical cost showed up in the field: shifting the schedule changes when rooms are heated or cooled, so an early or late start can leave people too warm or too cold.
