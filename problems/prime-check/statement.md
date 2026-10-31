Read an integer `n` and print `YES` if it is prime, otherwise `NO`.

A prime number is an integer greater than `1` whose only positive divisors are `1` and itself. In particular, `1` is **not** prime.

### Input

A single integer `n` (1 ≤ n ≤ 10⁹).

### Output

Print `YES` if `n` is prime, otherwise print `NO`.

### Example

**Input**
```
7
```

**Output**
```
YES
```

### Notes

- `2` is the only even prime; every other even number is composite.
- You do not need to test divisors beyond `√n`, so an `O(√n)` solution is fast enough for `n ≤ 10⁹`.
