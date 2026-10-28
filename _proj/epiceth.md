---
title: 'EpicEth: An HDL Circuit to Control a 3D Printer over Ethernet'
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: 'ECEN 620: Advanced Digital Systems, Brigham Young University'
year: 2022
figure: assets/epiceth.png
link: https://github.com/christopolise/EpicEth/blob/main/project_summary.md
links:
- text: Code
  url: https://github.com/christopolise/EpicEth?tab=readme-ov-file
  note: HDL sources, server code, bitstream, and build scripts on GitHub
- text: Demo
  url: https://www.youtube.com/watch?v=TTqIrQKLqos
  note: Video of EpicEth in action
link_label: Write-up
fig: epiceth-gcode
fig_aspect: 16/9
fig_label: A TX board sends short messages such as R9 over Ethernet to an RX board, which converts each into an absolute G-code line sent over UART to a printer. A print area shows the head moving, and a seven-segment display shows the direction, distance, and IP address.
fig_caption: <strong>One message, one G-code line.</strong> Each two-character message crosses the Ethernet link, and the RX software adds it to the head's tracked position, clamps it to the 0 to 200 print area, and sends an absolute <code>G1</code> move over UART. Watch the <code>LC</code> command hit the left edge and get clamped to X = 0. Set a distance and send your own commands below. The message format, limits, start-up codes, and display layout follow the code in the repository; the command sequence and timing are made up.
fig_illustrative: true
about: Two FPGA boards drive a 3D printer over Ethernet. Switches on the sending board compose a short move command; the receiving board runs a small TCP server that translates each message into G-code and keeps the print head inside the print area. I built the receiving half, which used under a fifth of the chip's logic and shows the last command on its seven-segment display.
---
