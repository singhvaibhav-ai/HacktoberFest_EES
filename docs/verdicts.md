# Understanding verdicts

The judge runs your Python program in the browser against a problem's test input and compares its output with the expected output. These examples use small, standalone inputs so you can see what each verdict means.

## AC — Accepted

Your program ran successfully and its output matched the expected output.

For input `2 3`, this prints the expected sum `5`:

```python
a, b = map(int, input().split())
print(a + b)
```

**What to do:** Nothing for this test. An Accepted result means all tests run by the judge passed.

## WA — Wrong Answer

Your program ran, but its output did not match the expected output. The logic may be wrong, or the output may include extra text or formatting.

For input `2 3`, this prints `-1` instead of `5`:

```python
a, b = map(int, input().split())
print(a - b)
```

**How to fix it:** Check the problem's required behavior, then try small examples and edge cases. Here, change subtraction to addition:

```python
print(a + b)
```

## TLE — Time Limit Exceeded

Your program did not finish before the problem's time limit. A loop that never ends is a simple example:

```python
while True:
    pass
```

**How to fix it:** Make sure every loop makes progress toward a stopping condition. For larger inputs, choose an algorithm that does not do unnecessary work.

## RE — Runtime Error

Your program started, but raised an exception while running. This example raises `ZeroDivisionError` when the input is `0`:

```python
n = int(input())
print(10 // n)
```

**How to fix it:** Check the traceback shown with the verdict. Handle inputs that could trigger the exception; for example, check that `n` is not zero before dividing.

## CE — Compilation Error

The judge could not parse the program because it contains a syntax error. Python reports this before running the code:

```python
if True
    print("hello")
```

**How to fix it:** Read the syntax error and correct the indicated line. This example needs a colon:

```python
if True:
    print("hello")
```
