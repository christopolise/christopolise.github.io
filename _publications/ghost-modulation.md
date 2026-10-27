---
title: "Hidden in Plain Sight: Communicating using Interference"
short_title: "Spectra: timing watermarks"
summary: "When a satellite drowns out a radio telescope, the observatory has no way to tell which satellite did it. Spectra lets the interfering transmitter name itself by nudging the timing of packets it was already sending, with no new hardware and no loss of throughput."
authors: Ashton Palacios, Daniel Harman, <b>Christopher Kitras</b>, Elle Kelsey, Mitchell C. Burnett, Willie K. Harris, Philip Lundrigan
venue: "IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN), 2025"
venue_short: "DySPAN 2025"
bib_venue: "Proc. IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN)"
year: 2025
area: wireless
featured: true
featured_order: 3
featured_fig: ghost-modulation-timing
figure: assets/gm.svg
link: assets/GM_v2.pdf
links:
  - text: "IEEE Xplore"
    url: https://ieeexplore.ieee.org/document/11115916
    note: "Published version"
fig_scripts: [ghost-modulation-timing, ghost-modulation-replay]
short:
  - label: "The problem"
    text: "Radio telescopes are being swamped by signals from low-orbit satellites, and when it happens they can't tell which satellite caused it. The ruined data is usually thrown away."
  - label: "The idea"
    text: "Have the satellite network slightly delay a few of the packets it already sends, so the pattern of delays spells out the satellite's ID. A listener only needs to note when each transmission happened, not decode it."
  - label: "The result"
    text: "Over a real Starlink link the hidden message arrived with bit error rates as low as 0.1%, the main data stream kept its throughput, and the added jitter stayed well under what voice calls can tolerate."
---

## Interference with no return address

Radio astronomy observatories listen for extremely faint signals from space, so they sit in radio quiet zones where ground transmitters are restricted. Low-earth-orbit (LEO) satellite constellations fly straight over those zones. Operators program their satellites not to transmit toward observatories, but side lobes, multipath, and imprecise satellite positions still put energy where it shouldn't be, and observatories still record interference.

When that happens, the observatory knows the time, the frequency, and perhaps the direction. It does not know who caused it. The affected data are typically flagged and deleted. One fix would be a universal preamble that every transmitter attaches to say who it is, but that would cost every device throughput and is impractical across very different radios.

<aside>Starlink alone plans 40,000 satellites. A constellation that large always has satellites above the horizon, so avoiding observatories by geography only goes so far.</aside>

The question this paper asks: **how can very different transmitters attach actionable information about themselves without lowering their data rate?** Our answer is Spectra, a protocol that rides on top of another protocol and carries its message entirely in transmission timing. It extends Ghost Modulation, earlier work from our lab, and fixes its weak points: brittle synchronization, one bit per symbol, no error correction, and no protection against replayed messages.

## A message carried in timing

A transmitter that forwards a stream of packets usually can't choose what is in them or when they are generated, but it can usually hold a packet back for a moment. Spectra uses that. The interfering device keeps sending its normal traffic and occasionally delays one packet by a few milliseconds. The *amount* of delay is the message.

The receiver never has to demodulate the satellite's signal. It only needs to timestamp when energy appears on the channel, which radio telescopes already do at the output of their digitizers.

{% include fig.html id="ghost-modulation-timing" aspect="16/9" illustrative=true label="A sender's packet stream with shaded symbol windows. At each window one packet is delayed into the left (0) or right (1) partition. The receiver timestamps arrivals, counts packets per partition, and reads out the bits; jitter can flip bits or produce erasures." caption="<strong>Bits in the delays.</strong> At each shaded symbol window the sender holds back one packet so it lands in the left partition (a 0) or the right one (a 1). The receiver sees only arrival times, counts packets on each side, and reads a bit, or a ? when the counts tie. Slide the jitter up to see network delay push packets into the wrong partition; the worst-case Starlink jitter we measured was 12 ms. Partition and guard sizes are MCS 0 from the paper; stream spacing and message are made up." %}

Each Spectra symbol is a short window split into two partitions, one for 0 and one for 1, followed by a guard interval so packets meant for one symbol don't spill into the next. The receiver decodes by comparing how many transmissions land in each partition. It uses a ratio rather than a simple count because other devices share the channel and their packets can fall into a window by chance. If neither side clearly wins, it reports an *erasure* instead of guessing.

The windows do not repeat on a fixed schedule. Their start times come from a pseudorandom sequence seeded by a key that the transmitter and receiver share. That spreads the small extra latency across the stream instead of concentrating it, and it means an outsider can't tell which packets carry the message.

### More bits per symbol

Spectra goes past one bit per symbol with an M-ary scheme that works like QAM. Instead of phase and amplitude, it varies how many packets are placed in a window and how they split between left and right. Two packets on the left and none on the right is 000; three on the right and one on the left is 011; and so on. Using several packets per symbol lets more of the stream pass untouched or only slightly delayed while throughput rises. With it, Spectra reached 200 bps.

A Spectra packet starts with a correlation-based sync pattern, then a 3-byte header and a 16-byte payload. The header holds a 4-bit modulation and coding scheme (MCS) field, always sent at a robust default rate so any receiver can read it, a CRC4 checksum, and security bits. The payload carries the satellite's NORAD catalog ID, which an observatory can look up for the satellite's frequency plan and orbit. Because the link is one-way, there are no retransmissions, so Spectra relies on short forward error correction codes (Hamming and Reed-Muller) that can resolve erasures. In simulation with Starlink-like jitter and 2% packet loss, the RM(5,16) code did best, and it was used for the remaining tests.

## Keeping the watermark honest

My part of this paper was its security. Ghost Modulation had none: anyone who could hear a sequence of watermarked transmissions could record it and play it back later. Because the observatory only looks at *when* energy appears on the channel, a replay doesn't need to decode anything; an attacker only has to reproduce the timing. I audited the protocol for attacks like this, identified where an eavesdropper could sniff and replay data, implemented a lightweight authentication code built from a shared secret and a timestamp, and wrote the section of the paper that explains and justifies it.

The threat model has four actors. Alice, a satellite network, sends data to Bob and embeds Spectra in that stream. Ollie, a passive observer such as an observatory, reads the Spectra timing. Eve can listen to everything and can transmit, and she wants Ollie to blame the wrong source or to believe a satellite is present when it isn't. Jamming is out of scope, and so is the confidentiality of the payload, since a NORAD ID is public.

Two mechanisms cover the attacks. To **modify** a message in flight, Eve would have to add energy at exactly the right moments, but the symbol windows sit at pseudorandom times she cannot predict. To stop **spoofing and replay**, every Spectra header carries a 16-bit time-based one-time password (TOTP), derived from a seed shared by Alice and Ollie and changing every minute. A recording replayed later carries an expired code. A forged message needs the right code, and Eve doesn't have the seed.

{% include fig.html id="ghost-modulation-replay" aspect="16/9" illustrative=true label="A satellite sends a watermark to an observatory while an attacker records it. Minutes later the attacker replays it and the observatory rejects it because the one-time code has changed. In forge mode the attacker guesses codes, and a counter shows the time cost climbing toward 1.5 days." caption="<strong>Replay and forgery.</strong> Eve records a real watermark and plays it back a few minutes later, but the header's one-time code changed when the minute rolled over, so Ollie rejects it. Switch to forging: each guess costs one full Spectra transmission, about four seconds, so hitting a 16-bit code takes 32,768 tries and about 1.5 days on average. Code values and pacing are illustrative; the code length, time slice, and cost are from the paper." %}

Sixteen bits looks short, and it is a deliberate trade: at Spectra's low data rate, every header bit is expensive. What makes it enough is the cost of each guess. The shortest Spectra transmission, at the highest MCS, takes about four seconds, and that MCS leaves no room between symbol windows for a second stream to run guesses in parallel. Guessing one code would take on average 32,768 attempts, about a day and a half of continuous transmitting.

## How it held up

We tested Spectra from the point of view of a device on the Internet sending through a real Starlink connection. That is harder than running it on the satellite itself, because Internet traffic adds its own jitter before the satellite link. A cloud server sent a custom iPerf stream with Spectra embedded, through Starlink, to a machine in our lab, which measured network performance and decoded Spectra from packet arrival times. Separately, a USRP B210 software-defined radio timestamped transmissions on a busy lab Wi-Fi channel to approximate an observatory that listens without demodulating.

<dl class="results">
  <div><dt>Spectra bit error rate over Starlink (MCS 0 and 1)</dt><dd>0.1%</dd></div>
  <div><dt>worst-case Starlink jitter we measured over three weeks</dt><dd>12 ms</dd></div>
  <div><dt>less added jitter with M-ary symbols, in some cases</dt><dd>&gt;30%</dd></div>
  <div><dt>attacker's average time to guess one 16-bit code</dt><dd>~1.5 days</dd></div>
</dl>

<table>
  <thead><tr><th>MCS</th><th class="n">Partition (ms)</th><th class="n">Guard (ms)</th><th class="n">Bits / symbol</th><th class="n">Packets / symbol</th><th class="n">BER over Starlink</th></tr></thead>
  <tbody>
    <tr><th>0</th><td class="n">40</td><td class="n">5</td><td class="n">1</td><td class="n">1</td><td class="n">0.1%</td></tr>
    <tr><th>1</th><td class="n">40</td><td class="n">5</td><td class="n">2</td><td class="n">2, 4</td><td class="n">0.1%</td></tr>
    <tr><th>2</th><td class="n">2.5</td><td class="n">5</td><td class="n">1</td><td class="n">1</td><td class="n">3.1%</td></tr>
    <tr><th>3</th><td class="n">2.5</td><td class="n">5</td><td class="n">2</td><td class="n">2, 4</td><td class="n">3.2%</td></tr>
  </tbody>
</table>

Narrow partitions (MCS 2 and 3) send faster but are more easily upset by jitter; wide ones are slower and nearly error-free. On the primary stream, received throughput stayed approximately equal to what was sent at every rate we tested, from 1 to 100 Mbps. Spectra did add some jitter, more when the stream was sparse, since a larger share of its packets are then delayed. In every case it stayed far below the 30 ms that demanding VoIP applications tolerate. On the noisy Wi-Fi channel, errors rose as the average spacing between transmissions approached the symbol window size, which is why the transmitter picks its MCS based on traffic and channel conditions.

## What I'd take from it

Spectra adds a second, low-rate channel to transmissions that already exist, using only software at the sender and a timestamp at the receiver. Observatories were the motivating case, but the same approach applies wherever a spectrum victim needs to identify the source of interference. A side channel that anyone can observe is also one anyone can imitate, so authentication had to be designed in from the start, sized to the protocol's very low data rate.
