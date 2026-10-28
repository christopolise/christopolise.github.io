---
title: Sustainable Radon Mitigation through Optimized HVAC Scheduling
authors: <b>Christopher Kitras</b>, John D. Beard, James D. Johnston, Philip Lundrigan
venue: 'ACM/IEEE International Conference on Connected Health: Applications, Systems and Engineering Technologies (CHASE), New York, 2025'
year: 2025
first_author: true
doi: 10.1145/3721201.3721398
figure: assets/rc.svg
link: assets/Radon.pdf
links:
- text: ACM
  url: https://dl.acm.org/doi/10.1145/3721201.3721398
  note: Published version, ACM Digital Library
- text: Xplore
  url: https://ieeexplore.ieee.org/document/11121074
  note: Published version, IEEE Xplore
- text: Presentation
  url: assets/radon_presentation.pdf
  note: CHASE 2025 talk slides
link_label: Paper
fig: radon-hvac-week
fig_aspect: 16/9
fig_label: A school week, Monday to Friday, for one season and zone. For each day, bars show when the HVAC runs under the control (06:00 to 17:00), extended (05:00 to 18:00) and optimized (derived start to 16:00) schedules, above a radon curve per schedule that falls toward the 4 pCi/L limit before school opens at 07:00. A running total adds up HVAC hours per schedule and the hours the optimized schedule saves.
fig_caption: '<strong>A week of HVAC schedules.</strong> A clock sweeps Monday to Friday, filling in when the HVAC runs under each schedule and adding up the hours; the optimized schedule starts at the time in Table 1 and stops at 16:00, so it runs the fewest hours. Runtime is the paper''s energy proxy: it reports hours saved, not kWh, and the totals here are computed from the real start and end times. Use <em>Next season</em> and <em>Next zone</em> to step through Table 1. The radon curve shapes are synthetic, drawn so the optimized curve reaches 4 pCi/L at 07:00 as the algorithm intends.'
fig_illustrative: true
abstract: Radon is a naturally occurring radioactive gas and is the second leading cause of lung cancer after smoking tobacco. Its invisible and odorless nature often leads to it going undetected, posing a significant health threat in susceptible areas, especially schools. Although traditional mitigation strategies are reasonable for smaller private properties, their cost can become prohibitively expensive and difficult for older and larger buildings. We propose, build, and test a cost-effective, sustainable mitigation strategy that uses the existing HVAC infrastructure of susceptible buildings to remove radon before occupancy hours. We compare this to a naive approach and find that we can save time on HVAC operation and keep radon levels to an acceptable low.
---
