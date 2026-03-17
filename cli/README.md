# Command-line Tool for AwesomeRPC

This small utility allows you to connect to an AwesomeRPC server and send
requests to it.

### `awesomerpc call <method-name> [args...]`

Call a method on the remote with the provided args.

### `awesomerpc notify <event-name> [value]`

Trigger an event on the remote, optionally sending the given value along with the event.

## Tips

### How to send a number as a string?

Encode the number into JSON, e.g. `12345` becomes `"12345"`.

```
$ awesomerpc notify editorMode '"3"'
```
