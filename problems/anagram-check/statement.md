Read two words and print `YES` if they are anagrams, otherwise print `NO`.

Two words are anagrams if one can be formed by rearranging the letters of the other. Both words must contain exactly the same letters with the same frequencies.

### Input

Two lines, each containing a word made of lowercase English letters (1 ≤ length ≤ 10⁵). The words may have different lengths.

### Output

Print `YES` if the words are anagrams, otherwise print `NO`.

### Example

**Input**
```
listen
silent
```

**Output**
```
YES
```

### Notes

- Words of different lengths can never be anagrams.
- `aab` and `abb` are **not** anagrams, because the counts of `a` and `b` differ.
- Sorting both words or counting letter frequencies both work in `O(n log n)` or `O(n)` time.
