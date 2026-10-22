# Tactics skill

This is the deployable skill for MatchMind's tactics agent. It is plain Markdown.
The agent reads the `- key: value` lines below. Everything else is documentation.

Written by `optimizer/skillopt.js`. Validation gate: held-out macro F1 must strictly improve.
Validation macro F1: 0.733 (default) -> see optimizer/report.json for the final value.

## Intents

- **halfspace**: the ball sits in a half-space band in the final third.
- **overload**: teammates near the ball outnumber opponents near the ball by at least `overload.minDiff`.
- **press**: the side that wins the ball, high up the pitch, with enough players close by.

## Parameters

- halfspace.yLow: 18
- halfspace.yHigh: 24
- halfspace.minProgress: 70
- overload.radius: 8
- overload.minDiff: 2
- press.minProgress: 52
- press.minPressure: 2
