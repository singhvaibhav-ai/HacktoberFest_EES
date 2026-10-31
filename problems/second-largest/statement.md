Given an array of `n` integers, print the second largest **distinct** value in the array. If there is no second largest distinct value, print `-1`.

### Input

The first line contains `n` (1 ≤ n ≤ 10⁵).
The second line contains `n` integers, each between −10⁹ and 10⁹.

### Output

Print the second largest distinct value, or `-1` if it does not exist.

### Example

**Input**
```
5
3 1 4 1 5
```

**Output**
```
4
```

### Notes

- The second largest value must be strictly smaller than the largest, so repeated copies of the maximum do not count.
- If all elements are equal, or the array has only one element, print `-1`.
