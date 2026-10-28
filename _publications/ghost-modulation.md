---
title: 'Hidden in Plain Sight: Communicating using Interference'
authors: Ashton Palacios, Daniel Harman, <b>Christopher Kitras</b>, Elle Kelsey, Mitchell C. Burnett, Willie K. Harrison, Philip Lundrigan
venue: IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN), 2025
year: 2025
figure: assets/gm.svg
link: assets/GM_v2.pdf
links:
- text: IEEE Xplore
  url: https://ieeexplore.ieee.org/document/11115916
  note: Published version
link_label: Paper
fig: ghost-modulation-timing
fig_aspect: 16/9
fig_label: A sender's packet stream with shaded symbol windows. At each window one packet is delayed into the left (0) or right (1) partition. The receiver timestamps arrivals, counts packets per partition, and reads out the bits; jitter can flip bits or produce erasures.
fig_caption: <strong>Bits in the delays.</strong> At each shaded symbol window the sender holds back one packet so it lands in the left partition (a 0) or the right one (a 1). The receiver sees only arrival times, counts packets on each side, and reads a bit, or a ? when the counts tie. Slide the jitter up to see network delay push packets into the wrong partition; the worst-case Starlink jitter we measured was 12 ms. Partition and guard sizes are MCS 0 from the paper; stream spacing and message are made up.
fig_illustrative: true
abstract: Radio astronomy observatories examine the universe by capturing faint RF signals from space. The equipment to capture these signals is extremely sensitive, and nearby transmitters, such as LEO satellites, cause destructive interference. We propose the Spectra watermarking protocol to add an identifying fingerprint to these interfering transmitters. Spectra changes the timing of key transmissions to encode identifying information that can be decoded by examining transmission timestamps and without having to demodulate the actual transmission. We implement multiple forward error correction codes for Spectra to account for dynamic LEO satellite channels. We evaluate Spectra and show that it can operate over highly variable channels with low BER while preserving the network performance of the interfering device.
---
