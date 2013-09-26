#include <fcntl.h>
#include <sys/ioctl.h>

#define CEC_IOC_MAGIC        'c'

/**
 * CEC device request code to set logical address.
 */
#define CEC_IOC_SETLADDR     _IOW(CEC_IOC_MAGIC, 0, unsigned int)

#include <node.h>
#include <v8.h>

using namespace v8;

Handle<Value> setLogAddr(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 2) {
    ThrowException(Exception::TypeError(String::New("Wrong number of arguments")));
    return scope.Close(Undefined());
  }

  if (!args[0]->IsNumber()|| !args[1]->IsNumber()) {
    ThrowException(Exception::TypeError(String::New("Wrong arguments")));
    return scope.Close(Undefined());
  }

  int returnvalue = 1;
  int fd = args[0]->NumberValue();
	unsigned int laddr = args[1]->NumberValue();
	if (ioctl(fd, CEC_IOC_SETLADDR, &laddr)) {
        returnvalue = 0;
    }

  Local<Number> ret = Number::New(returnvalue);
  return scope.Close(ret);
}

void Init(Handle<Object> exports) {
  exports->Set(String::NewSymbol("setLogicalAddress"),
      FunctionTemplate::New(setLogAddr)->GetFunction());
}

NODE_MODULE(cecioctl, Init)