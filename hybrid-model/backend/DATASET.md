# Nepali E-Commerce Recommendation Dataset

This dataset is a **statistically simulated model** built to reflect the unique characteristics of the Nepali e-commerce market. It follows a "Smart Data for Small Markets" philosophy, addressing the challenges of data sparsity and localized market cycles.

## Philosophy: Smart Data for Small Markets
In emerging markets like Nepal, raw interaction data is often sparse, noisy, or proprietary. To facilitate academic research (RQ3: Cold-Start handling) and architectural prototyping (RQ2: Infrastructure constraints), this dataset simulates:
- **Nepali Market Demographics:** User distributions across cities like Kathmandu, Pokhara, and Biratnagar.
- **Cultural Seasonality:** Multiplier effects for localized festival cycles (Dashain/Tihar in months 10 and 11).
- **Product Diversity:** A catalog ranging from traditional apparel (Dhaka Topi, Daura Suruwal) to modern electronics and daily groceries.

## Dataset Components

### 1. Products (`products.csv`)
- **Size:** 500 items.
- **Attributes:** ID, Name, Category (Traditional, Electronics, etc.), Price (NPR), Rating, Stock Status, New Arrival status.
- **Key Categories:** Traditional Attire, Handicrafts & Art, Kitchen & Home, Electronics, Daily Groceries.

### 2. Users (`users.csv`)
- **Size:** 300 users.
- **Attributes:** ID, City, Age, Gender, User Type (New, Regular, Power), Preferred Categories.
- **Distribution:** Weighted towards major urban centers to reflect current digital adoption rates.

### 3. Interactions (`interactions.csv`)
- **Size:** ~6,000 interactions.
- **Types:** View (1.0), Add-to-Cart (2.0), Purchase (4.0), Rating (1.0-5.0).
- **Temporal Dynamics:** Includes timestamps used for time-based train/test splits and seasonal boosting logic.

## Usage in Thesis
This dataset enables empirical testing of:
- **RQ1:** Accuracy improvements of the Adaptive Hybrid model over the non-personalized Baseline.
- **RQ2:** Infrastructure performance (Latency) in high-cache-miss vs high-cache-hit scenarios.
- **RQ3:** Cold-start mitigation strategies using content-based fallbacks ($\alpha_u$ curve).
