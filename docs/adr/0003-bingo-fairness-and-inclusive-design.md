# 0003. Bingo Fairness and Inclusive Board Arrangement

## Context
Previously, 5x5 Bingo boards distributed missions via unconstrained random shuffling, which caused extreme variance in line difficulty (ranging from level sum 5 to 15 per line). In addition, locking the center cell (position 12, which intersects 4 Bingo lines) exclusively to monetary donations created an economic barrier for lower-income citizens who could not afford disposable donations, blocking them from four Bingo lines simultaneously.

## Decision
1. **Constrained Line Distribution**:
   - The layout algorithm arranges the 24 mission cells across the 5x5 board so that every row and column maintains a total difficulty level sum between 12 and 14.
   - This ensures that completing any single line delivers a balanced challenge and consistent token payout (~44–48 Tokens including line bonus).
2. **Dual-Action Center Tile (Position 12)**:
   - The central tile is broadened from a strict donation paywall into an inclusive "Social & Community Action" cell.
   - It is satisfied by either:
     (a) An e-Donation to a registered charity (via `syncDonationProgress`), OR
     (b) A verified purchase transaction at any participating local community micro-merchant (via `syncPaymentProgress`).
   - This ensures zero economic exclusion while preserving social impact and local economy stimulation.
3. **Constrained Pair Swapping Layout Algorithm**:
   - After missions are selected, the layout engine distributes cells onto the 5x5 grid and runs constrained pair swaps between rows and columns until the level sum of every line falls strictly within 12–14 levels.
4. **Relative Effort Scaling under Fixed 63 Budget**:
   - All citizens receive a fixed board budget of 63 (guaranteeing the 376-token full board yield from ADR-0002).
   - Mission ladder selection evaluates personal baseline performance and targets a relative +10% to +20% growth increment, equalizing subjective difficulty across different socio-economic spending levels.
