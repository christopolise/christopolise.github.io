---
title: A Replication Study of DSAV Measurement
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: 'CS 660: Advanced Computer Networks, Brigham Young University'
year: 2024
figure: assets/Full_dsav.svg
link: assets/dsav.pdf
links:
- text: Presentation
  url: assets/dsav_pres.pdf
  note: Class presentation slides
link_label: Report
fig: dsav-spoof
fig_aspect: 16/9
fig_label: A prober sends spoofed DNS queries to a recursive resolver behind a gateway. With DSAV off, queries with believable inside addresses reach the resolver, which looks the name up at our server, and the lookup is logged. With DSAV on, the gateway drops every one.
fig_caption: '<strong>The measurement.</strong> The prober sends one query from each of the five kinds of forged source. With DSAV off, the believable ones reach the resolver, which then looks the name up at our server, and we log the failure. Turn DSAV on and the gateway drops them all. The 2020 and 2024 columns are measured: among targets that leaked at all, the share reached by at least one query of that kind. The addresses and the animation are examples; in the real data private, destination-as-source, and loopback queries almost never produced a lookup in 2024.'
fig_illustrative: true
abstract: Destination-side source address validation (DSAV) plays an important role in the modern internet. Despite this, many autonomous systems have a history of this service being disabled, as was indicated in a 2020 measurement study on DSAV. This paper acts as a replication study for that work and seeks to measure any change in DSAV utilization. While little has changed overall in global DSAV utilization between the two studies, several outliers are discovered and discussed.
---
