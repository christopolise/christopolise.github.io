---
title:  "EpicEth: A HDL Circuit to Control a 3D Printer over Ethernet"
short_title: "EpicEth"
summary: "Two FPGA boards and a 3D printer. One board builds print-head moves from switches and sends them over Ethernet; the other runs a small TCP server that turns each message into G-code and keeps the head inside the print area."
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: "ECEN 620: Advanced Digital Systems, Brigham Young University"
venue_short: "ECEN 620, BYU"
year: 2024
figure: assets/epiceth.png
link: https://github.com/christopolise/EpicEth/blob/main/project_summary.md
link_label: "Project summary"
links:
  - text: "Code"
    url: https://github.com/christopolise/EpicEth?tab=readme-ov-file
    note: "HDL sources, server code, bitstream, and build scripts on GitHub"
  - text: "Demo"
    url: https://www.youtube.com/watch?v=TTqIrQKLqos
    note: "Video of EpicEth in action"
fig_scripts: [epiceth-gcode]
short:
  - label: "The goal"
    text: "Drive a 3D printer's head from a second circuit board, over an ordinary network cable, using hardware we designed ourselves."
  - label: "What we built"
    text: "A sending board where switches and buttons compose a short move command, and a receiving board that runs a small network server, translates each command into the printer's G-code language, and shows the last command on its display."
  - label: "How it went"
    text: "The receiving design used under a fifth of the chip's logic. The hardest part was the vendor tools, not the circuit, and rebuilding the project from scratch took real effort."
---

## The goal

A 3D printer moves its print head by following G-code, a plain-text list of machine commands such as `G1 X15` (move to X = 15). Printers usually get G-code from a computer over USB or from a memory card. EpicEth sends it from custom hardware instead: two FPGA boards, a network link between them, and a printer at the end.

An FPGA is a chip whose circuitry is defined by a hardware description, so each board here is a small system-on-chip: a MicroBlaze soft processor with the peripherals it needs, plus a custom circuit block of our own. The project was the final design for ECEN 620, Advanced Digital Systems, built on Nexys 4 DDR boards with Xilinx Vivado and Vitis 2019.2.

## Two boards, one link

The system has two halves.

- **TX (sender).** Switches and buttons set the parameters of a move, and the switches also select the IP address of the receiving board. The TX board packs the move into a TCP message and sends it over Ethernet. Bryson Schiel built this half.
- **RX (receiver).** The RX board hosts a TCP server, built from Xilinx's lwIP (lightweight IP) echo-server example, that listens on port 7. It turns each message into G-code, sends that to the printer over a serial (UART) link, and shows the last command and its own IP address on the board's eight-digit seven-segment display. I was in charge of this half.

Most of the RX block design exists to support the processor and the network stack. The pieces added for this project were:

- **AXI EthernetLite**, the Ethernet controller, for both sending and receiving.
- **AXI UARTLite**, a serial port. It carried the server's console output and was also the path that delivered G-code to the printer.
- **Memory Interface Generator**, the memory controller. The Ethernet module and lwIP need RAM; without it there is nowhere to keep the stack's variables.
- **Ethernet PHY MII to Reduced MII**, the bridge to the board's physical Ethernet chip. This core is deprecated and hard to find, but the Nexys 4 DDR had no straightforward alternative.
- **SoCTopWrapper**, our custom core, which drives the seven-segment display.

## From a message to G-code

The message on the wire is tiny: a direction letter and one hexadecimal digit of distance. `R9` means right by 9, `UF` means up by 15. The letters are L and R for the X axis and U and D for Y, and the distance runs from 0 to F.

Translating that is not a one-to-one substitution. At start-up the RX server sends the printer three lines: `G28` to home the head to the origin, `G90` to put the printer in absolute positioning mode, and `G1 F1200` to set the feed rate. In absolute mode, `G1 X9` means "go to X = 9", not "move 9 to the right". So the server keeps its own copy of where the head is. For each message, it adds or subtracts the distance on one axis, clamps the result to the print area (0 to 200 on each axis), and sends the new absolute position. The clamp is what keeps a run of commands from driving the head off the bed: sending `LC` (left by 12) while the head sits at X = 9 produces `G1 X0`, not X = −3.

{% include fig.html id="epiceth-gcode" aspect="16/9" illustrative=true label="A TX board sends short messages such as R9 over Ethernet to an RX board, which converts each into an absolute G-code line sent over UART to a printer. A print area shows the head moving, and a seven-segment display shows the direction, distance, and IP address." caption="<strong>One message, one G-code line.</strong> Each two-character message crosses the Ethernet link, and the RX software adds it to the head's tracked position, clamps it to the 0 to 200 print area, and sends an absolute <code>G1</code> move over UART. Watch the <code>LC</code> command hit the left edge and get clamped to X = 0. Set a distance and send your own commands below. The message format, limits, start-up codes, and display layout follow the code in the repository; the command sequence and timing are made up." %}

## The display core

The custom core is an AXI-Lite peripheral, so the processor reads and writes it like memory. It holds one 32-bit register, `data_to_draw`, that maps onto the eight digits of the seven-segment display, left to right:

<table>
  <thead><tr><th>digits</th><th>shows</th><th>example</th></tr></thead>
  <tbody>
    <tr><td>1 and 2</td><td>direction, as letters</td><td><code>uP</code>, <code>dn</code>, <code>LF</code>, <code>rt</code></td></tr>
    <tr><td>3</td><td>blank spacer</td><td></td></tr>
    <tr><td>4</td><td>distance, one hex digit</td><td><code>0</code> to <code>F</code></td></tr>
    <tr><td>5 to 8</td><td>last two bytes of the board's IP address, in hex</td><td><code>0087</code> for 192.168.0.135</td></tr>
  </tbody>
</table>

A plain seven-segment controller shows hex digits, so the core includes a modified controller that draws the first two digits as direction letters instead. Showing the IP address on the board itself means anyone setting the TX switches can read off the address to target.

The register has to be readable as well as writable. I first made it write-only, since the processor only needed to update the display. But the software also reads the register back, for example to pick up the IP bytes that the start-up code writes into it, and reading a write-only register crashed the program running on the processor.

## Resource use

The full RX design, processor and network hardware included, uses less than a fifth of the FPGA's logic. Vivado's utilization report:

<dl class="results">
  <div><dt>lookup tables used (11,263 of 63,400)</dt><dd>17.8%</dd></div>
  <div><dt>block RAMs used (22 of 135)</dt><dd>16.3%</dd></div>
  <div><dt>I/O pins used (76 of 210)</dt><dd>36.2%</dd></div>
</dl>

<table>
  <thead><tr><th>resource</th><th class="n">used</th><th class="n">available</th><th class="n">utilization</th></tr></thead>
  <tbody>
    <tr><th>LUT</th><td class="n">11,263</td><td class="n">63,400</td><td class="n">17.8%</td></tr>
    <tr><th>LUTRAM</th><td class="n">1,647</td><td class="n">19,000</td><td class="n">8.7%</td></tr>
    <tr><th>Flip-flop</th><td class="n">11,991</td><td class="n">126,800</td><td class="n">9.5%</td></tr>
    <tr><th>BRAM</th><td class="n">22</td><td class="n">135</td><td class="n">16.3%</td></tr>
    <tr><th>I/O</th><td class="n">76</td><td class="n">210</td><td class="n">36.2%</td></tr>
    <tr><th>BUFG</th><td class="n">9</td><td class="n">32</td><td class="n">28.1%</td></tr>
    <tr><th>MMCM</th><td class="n">2</td><td class="n">6</td><td class="n">33.3%</td></tr>
    <tr><th>PLL</th><td class="n">1</td><td class="n">6</td><td class="n">16.7%</td></tr>
  </tbody>
</table>

## What I'd take from it

The circuit was the easy part. The project log records 21 hours on this final stretch, and its major challenges were all in the toolchain. Vitis expects the bitstream, the hardware description, the program file, and the memory map at paths relative to its workspace, and they were rarely where it looked, so every path had to be pointed at the Vivado project by hand. After each change to the block design, a new bitstream and hardware description had to be exported before Vitis saw it. A recurring `Data2Mem Failed` error turned out to be safe to ignore.

Two lessons from the build notes. First, use the board's official board file: it fills in the many parameters that complex cores need, especially the SDRAM settings the Ethernet controller depends on, and those settings are where online tutorials for other boards and tool versions kept going wrong. Second, plan for reproducibility early. Writing a script that rebuilds the project from scratch, which the repository includes, can take longer than building the design did.
