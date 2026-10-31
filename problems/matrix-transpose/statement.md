Read an `r × c` matrix and print its transpose.

The transpose of an `r × c` matrix is a `c × r` matrix where the element in row `i` and column `j` is the element in row `j` and column `i` of the original matrix.

### Input

The first line contains two integers `r` and `c` (1 ≤ r, c ≤ 100).
The next `r` lines each contain `c` integers (each between −10⁹ and 10⁹), separated by spaces.

### Output

Print `c` lines. The `i`-th line must contain the `r` integers of the `i`-th column of the original matrix, separated by single spaces.

### Example

**Input**
```
2 3
1 2 3
4 5 6
```

**Output**
```
1 4
2 5
3 6
```

### Notes

- The number of rows and columns swaps: an `r × c` input produces a `c × r` output.
- Every value from the input must appear exactly once in the output.
