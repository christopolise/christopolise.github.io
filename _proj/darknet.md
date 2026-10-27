---
title: "Unintentional Darknet: An Analysis of Scanning Behavior through the Lens of Abandoned Domains"
short_title: "Unintentional darknet"
summary: "An abandoned university project website still draws hundreds of thousands of DNS lookups. We found that the hosts that never ask for the site's real address are more than twice as likely to have a record of abuse, so a dead domain can work as a free scanner detector."
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: "CS 660: Advanced Computer Networks, Brigham Young University"
venue_short: "CS 660, BYU"
year: 2024
area: wireless
figure: assets/map.png
link: assets/darknet.pdf
link_label: "Read the report"
links:
  - text: "Presentation"
    url: assets/darknet_pres.pdf
    note: "Class presentation slides"
fig_scripts: [darknet-queries]
short:
  - label: "The goal"
    text: "Find out who is still looking up the web addresses of a BYU research project that was abandoned years ago, and whether those visitors look suspicious."
  - label: "What we built"
    text: "An analysis of three weeks of BYU's DNS logs that separates hosts that eventually find the project's real address from hosts that keep asking for addresses that lead nowhere."
  - label: "How it went"
    text: "Hosts that never found the real site were flagged on a public abuse database far more often, 42.9% against 18.5%, which suggests old domains can help spot network scanners."
---

## A project that never went away

Network researchers often watch a *darknet*: a large block of unused IP addresses. Nothing legitimate should contact them, so whatever does is usually a scanner. This course project asked whether an abandoned domain name can do the same job, using the logs of a DNS server instead of thousands of empty addresses.

The domain we found was JHDL, the Java Hardware Design Language. JHDL let engineers describe FPGA circuits with Java's object-oriented style instead of a traditional hardware description language like VHDL or Verilog. BYU's Configurable Computing Lab first released it in 1998 and built its website in 1999. The site was last modified in 2006. The project has 97 citations in papers and 21 in patents, but by the time of this study it was effectively dormant, and its website had been handed down to one faculty member as something of a department heirloom.

<aside>Old websites are a known security risk because they tend to run outdated software. That makes interest in one worth a closer look, though DNS logs alone can't show an attack.</aside>

## Finding it in the logs

We worked from BYU's authoritative DNS logs for August 26 to September 15, 2024, which record every query with its timestamp, query name (QNAME), and source address. Following one of the course's research prompts, we asked which names people query that BYU wouldn't expect, and filtered out every QNAME containing "byu".

Most of what remained belonged to Ensign College, a sister school, and services it uses. But three of the top fifteen unexpected names were JHDL's: jhdl.com was third, with 779,440 queries, and jhdl.org and jhdl.net followed with about 97,000 and 95,000. `whois` showed all three were registered to BYU's Configurable Computing Lab.

None of those names works. Querying jhdl.com, or any of its subdomains, returns SERVFAIL. The project's site actually lives at jhdl.ee.byu.edu. Many of the queries also asked for names that never existed: `cbserver` and `ctdns` subdomains (possibly related to certificate transparency) and single letters like `a.jhdl.com`, which looks like an attempt to enumerate every possible subdomain.

## Two kinds of visitors

That gave us a way to sort the traffic. A host that wants the real project will, after a failed lookup, find jhdl.ee.byu.edu, get an answer, and cache it, so it stops asking. A host that only ever asks for names that lead nowhere, again and again, behaves more like a scanner. Only 47 hosts in the data queried both the real name and another JHDL name. We took the 40 most active hosts that eventually queried jhdl.ee.byu.edu and the 40 most active that never did, and compared them.

{% include fig.html id="darknet-queries" aspect="16/9" illustrative=true label="Six hosts send DNS queries to BYU's DNS server. Three get SERVFAIL once, then ask for jhdl.ee.byu.edu, get an answer, and go quiet. Three keep querying dead JHDL names. Bars then show 18.5 percent versus 42.9 percent flagged on AbuseIPDB." caption="<strong>Two kinds of visitors.</strong> Hosts in the top group fail once, ask for the real site, get an answer, and go quiet because it's cached. Hosts in the bottom group keep cycling through dead names (counters show queries sent). Switch the log to follow either kind. The AbuseIPDB shares are from the report; host counts, timing, and query order are illustrative." %}

The work ran in Python and Jupyter on BYU's MaryLou supercomputer, filtering the logs down to QNAMEs containing "jhdl" with Pandas. We located sources with MaxMind's GeoLite database and checked each address against AbuseIPDB, a crowd-sourced record of addresses reported for scanning, phishing, denial of service, and similar behavior, which assigns each one a confidence of abuse.

## What the traffic looked like

The queries were very uneven. A small number of autonomous systems sent most of them, some with tens of thousands of queries against others' few thousand. The heaviest sources were in China, Malaysia, Belgium, and Germany. The United States, where JHDL was built and is still hosted, was not among the top sources.

<table>
  <thead><tr><th>Autonomous system</th><th>Country</th><th class="n">ASN</th><th class="n">Queries (at least)</th></tr></thead>
  <tbody>
    <tr><td>UNICOM-SHFT-IDC, Shanghai</td><td>China</td><td class="n">140979</td><td class="n">44,838</td></tr>
    <tr><td>TENCENT-NET-AP</td><td>China</td><td class="n">45090</td><td class="n">11,908</td></tr>
    <tr><td>CHINANET BACKBONE</td><td>China</td><td class="n">4134</td><td class="n">9,457</td></tr>
    <tr><td>UNICOM-SHFT-IDC, Guangdong</td><td>China</td><td class="n">135061</td><td class="n">9,297</td></tr>
    <tr><td>TELEPOINT, BG</td><td>Belgium</td><td class="n">31083</td><td class="n">7,388</td></tr>
    <tr><td>TTSSB-MY TM Technology Services</td><td>Malaysia</td><td class="n">4788</td><td class="n">7,160</td></tr>
    <tr><td>DE-FIRSTCOLO</td><td>Germany</td><td class="n">44066</td><td class="n">5,470</td></tr>
  </tbody>
</table>

The AbuseIPDB comparison surprised both of us. Hosts that never queried the real site were much more likely to have an abuse rating, and their ratings were higher too: the top scores in that group reached 35%, against 30% in the other.

<dl class="results">
  <div><dt>queries for jhdl.com in three weeks</dt><dd>779,440</dd></div>
  <div><dt>hosts that eventually found the real site and were flagged on AbuseIPDB</dt><dd>18.5%</dd></div>
  <div><dt>hosts that never did and were flagged</dt><dd>42.9%</dd></div>
</dl>

## How it went

The result is preliminary, and we said so in the report: DNS logs can't show what a host did once it connected, and confirming the pattern would mean pairing these logs with the JHDL web server's own. The traffic spike from August 29 to September 1 also went unexplained; it fell during new-student orientation, but we found no clear link in the time the project allowed. Still, the pattern points to a cheap signal. A host that keeps asking for a domain that leads nowhere, and never asks for the real one, deserves a second look, and every organization with abandoned project sites already has the logs to look.
