---
title: 'Unintentional Darknet: An Analysis of Scanning Behavior through the Lens of Abandoned Domains'
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: 'CS 660: Advanced Computer Networks, Brigham Young University'
year: 2024
figure: assets/map.png
link: assets/darknet.pdf
links:
- text: Presentation
  url: assets/darknet_pres.pdf
  note: Class presentation slides
link_label: Report
fig: darknet-queries
fig_aspect: 16/9
fig_label: Six hosts send DNS queries to BYU's DNS server. Three get SERVFAIL once, then ask for jhdl.ee.byu.edu, get an answer, and go quiet. Three keep querying dead JHDL names. Bars then show 18.5 percent versus 42.9 percent flagged on AbuseIPDB.
fig_caption: <strong>Two kinds of visitors.</strong> Hosts in the top group fail once, ask for the real site, get an answer, and go quiet because it's cached. Hosts in the bottom group keep cycling through dead names (counters show queries sent). Switch the log to follow either kind. The AbuseIPDB shares are from the report; host counts, timing, and query order are illustrative.
fig_illustrative: true
about: An abandoned BYU research project's website still draws hundreds of thousands of DNS lookups years later. Using three weeks of the university's DNS logs, we separated hosts that eventually find the project's real address from hosts that keep asking for addresses that lead nowhere. Hosts that never found the real site appeared on a public abuse database far more often (42.9% against 18.5%), which suggests a dead domain can double as a free scanner detector.
---
