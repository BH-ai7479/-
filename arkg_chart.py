import yfinance as yf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

TICKER = "ARKG"
NAME = "ARK Genomic Revolution ETF"
DESC = "(Genomics & biotech innovation, actively managed)"

df = yf.download(TICKER, start="2025-01-01", auto_adjust=True, progress=False)
close = df["Close"].squeeze().dropna()
ma60 = close.rolling(60).mean()

total_ret = (close.iloc[-1] / close.iloc[0] - 1) * 100
ret5 = (close.iloc[-1] / close.iloc[-6] - 1) * 100

fig, ax = plt.subplots(figsize=(12, 6), facecolor="white")
ax.set_facecolor("white")
ax.plot(close.index, close.values, color="black", lw=1.8)
ax.plot(ma60.index, ma60.values, color="orange", lw=1.0)

ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
for s in ("top", "right"):
    ax.spines[s].set_visible(False)

ax.text(0.0, 1.10, NAME, transform=ax.transAxes, fontsize=16, fontweight="bold", va="bottom")
ax.text(0.0, 1.03, DESC, transform=ax.transAxes, fontsize=10, color="dimgray", va="bottom")
ax.text(1.0, 1.08, f"{total_ret:+.1f}%", transform=ax.transAxes, fontsize=20,
        fontweight="bold", color="red", ha="right", va="bottom")

ax.annotate(f"5D {ret5:+.1f}%", xy=(close.index[-1], close.iloc[-1]),
            xytext=(8, 0), textcoords="offset points", fontsize=10,
            color="red" if ret5 >= 0 else "blue", va="center", annotation_clip=False)

fig.tight_layout()
fig.subplots_adjust(top=0.84, right=0.93)
fig.savefig("arkg_chart.png", dpi=150, facecolor="white")
