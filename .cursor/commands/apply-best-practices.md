# apply-best-practices

Always use functions that could be tested easily:

- Instead of logging the output to the console, return it so the value could be retrieved from a test and validated.
- Instead of logging errors to the console, throw exceptions.
