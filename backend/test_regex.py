import re

test_lines = [
    "A. Option A B. Option B",
    "A. answer a B. answer B",
    "C. Option C   D. Option D",
    "A) Option 1 B) Option 2",
    "A: Option A B: Option B",
    "Garbage A. Option A"
]

opt_pattern = re.compile(r'(?:^|\s+)([A-Ga-g])[\.\):]\s+(.*?)(?=\s+[A-Ga-g][\.\):]\s+|$)')

for line in test_lines:
    print(f"Line: '{line}'")
    if opt_pattern.match(line):
        print(" -> Matches start of line!")
        matches = list(opt_pattern.finditer(line))
        for m in matches:
            print(f"  Option {m.group(1)}: {m.group(2)}")
    else:
        print(" -> Does NOT match start of line!")
    print("---")
