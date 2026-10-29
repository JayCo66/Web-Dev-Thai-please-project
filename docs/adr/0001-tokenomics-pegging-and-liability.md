# 0001. Impact Token Pegging and Monthly Liability Cap

## Context
The THAI Please platform previously issued up to 1,880 Impact Tokens per completed Bingo board while pricing 50 THB cash discount vouchers at only 50 Tokens. A citizen completing a single board could redeem 37 vouchers (1,850 THB in direct subsidy), creating an unsustainable fiscal deficit for the program on top of the 60/40 Co-payment subsidy.

## Decision
1. **Nominal Peg**: Anchor 1 Impact Token at 0.10 THB (10 Tokens = 1 THB).
2. **Monthly Liability Cap**: Enforce an incentive budget ceiling of 150 THB per citizen per month, restricting maximum token generation to ~1,500 Tokens/month across all 4 monthly boards (~350–375 Tokens per board).
3. **Sink Hierarchy**: Hard Sinks (50 THB vouchers priced at 500 Tokens) are capped at 1 redemption per user per month. The remaining token circulation is directed into Soft Sinks (Lucky Draw tickets priced at 20–30 Tokens) backed by a fixed prize pool.
