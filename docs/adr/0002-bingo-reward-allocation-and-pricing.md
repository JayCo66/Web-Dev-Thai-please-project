# 0002. Bingo Reward Allocation and Catalog Pricing

## Context
Following the 10 Tokens = 1 THB pegging decision (ADR-0001), the platform required specific formulas for token faucets across 5x5 Bingo boards and corresponding redemption sinks in the rewards catalog.

## Decision
1. **Bingo Board Token Allocation**:
   - Regular cells: `level * 2` tokens (Level 1: 2, Level 2: 4, Level 3: 6). Average 24-cell board budget of 63 generates 126 Tokens.
   - Center donation cell: 10 Tokens.
   - Completed lines: 20 Tokens per completed line (maximum 12 lines = 240 Tokens).
   - Total full-clear board yield is fixed at 376 Impact Tokens (approx. 37.60 THB value).
2. **Catalog Pricing**:
   - 50 THB Discount Voucher: 500 Tokens (quota: max 1 voucher per citizen per month).
   - Community Drink Coupon (value 40 THB): 350 Tokens.
   - Handcrafted Community Tote Bag (value 100 THB): 1,000 Tokens.
   - Lucky Draw Ticket (Soft Sink): 25 Tokens (bundles: 3 tickets for 60 Tokens, 5 tickets for 90 Tokens).
3. **Donation Exemption**:
   - Donations earn 1 Token per 20 THB (0.5% effective reward rate) and are exempt from the Monthly Liability Cap.
