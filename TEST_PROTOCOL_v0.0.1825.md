# Test Protocol — v0.0.1825 Extra Activation Completion

1. Update the QA system and confirm that the version shown is `0.0.1825`.
2. Run an encounter until all regular initiative slots are complete while one participant still has an unused extra activation.
3. Click **Use Extra** for that participant during **End of Round**.
4. Confirm that the active-turn panel remains visible and shows the participant plus the Action and Maneuver controls.
5. Use the Action and Maneuver controls as desired.
6. Click **Mark Extra Activation Used**.
7. Confirm that the participant's activation counter changes to its completed value, such as `2 / 2`, and that no active turn remains.
8. Click **Start Round 2** and confirm that the next round begins without using **Force End Turn**.
9. Regression: run a normal initiative activation and confirm that **End Turn** still completes it normally.
