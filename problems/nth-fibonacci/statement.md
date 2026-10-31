Read `n` and print the `n`-th Fibonacci number.

The Fibonacci sequence is defined by:

- `F(0) = 0`
- `F(1) = 1`
- `F(n) = F(n - 1) + F(n - 2)` for `n ≥ 2`

### Input

A single integer `n` (0 ≤ n ≤ 90).

### Output

Print `F(n)`.

### Example

**Input**
```
10
```

**Output**
```
55
```

### Notes

- The first few values are `0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, ...`.
- `F(90)` fits in a signed 64-bit integer but not in a 32-bit integer, so be careful with fixed-width types.
