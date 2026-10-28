---
title: Location Monitoring Framework for Citizen Science Sensors
authors: <b>Christopher Kitras</b>, Carter Pollan, Kyle Myers, Philip Lundrigan
venue: 'Air Quality: Science for Solutions (S4S), 2023'
year: 2023
awards:
- Best Poster Award
figure: assets/s4s23.svg
link: assets/S4S-2023.pdf
first_author: true
link_label: Poster
fig: lamda-cold
fig_aspect: 16/9
fig_label: A timeline of sensor uploads with a gap. Traceroute paths before and after the gap are compared; the similarity score stays above the 90 percent threshold unless the sensor moved.
fig_caption: <strong>Change of Location Detection.</strong> Uploads arrive every few minutes until the sensor goes quiet. After the gap, CoLD compares a week of trusted paths from before the gap with the new paths. Choose whether the sensor really moved and watch the score land above or below the 90% threshold.
fig_illustrative: true
about: Community air-quality sensors have no GPS, so their owners can register them anywhere on a public map. This framework verifies a sensor's location at registration by borrowing the owner's phone location and comparing the phone's and the sensor's latency to a server, then watches the sensor's network path afterward for signs that it was moved. The full system is described in the ICCCN 2023 paper.
---
