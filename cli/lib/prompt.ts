const CTRL_C = "";
const CTRL_D = "";
const BACKSPACE = "";

let nonTtyBuffer = "";
let nonTtyReady = false;

function readAllStdinOnce(): Promise<void> {
  if (nonTtyReady) return Promise.resolve();
  nonTtyReady = true;
  return new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      nonTtyBuffer += chunk;
    });
    process.stdin.on("end", resolve);
    process.stdin.resume();
  });
}

async function promptPasswordNonInteractive(question: string): Promise<string> {
  process.stdout.write(question);
  await readAllStdinOnce();
  const newline = nonTtyBuffer.indexOf("\n");
  let line: string;
  if (newline >= 0) {
    line = nonTtyBuffer.slice(0, newline);
    nonTtyBuffer = nonTtyBuffer.slice(newline + 1);
  } else {
    line = nonTtyBuffer;
    nonTtyBuffer = "";
  }
  process.stdout.write("\n");
  return line.replace(/\r$/, "");
}

export function promptPassword(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return promptPasswordNonInteractive(question);
  }

  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);

    let password = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char: string) => {
      switch (char) {
        case "\n":
        case "\r":
        case CTRL_D:
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case CTRL_C:
          process.stdout.write("\n");
          process.exit(130);
          break;
        case BACKSPACE:
        case "\b":
          password = password.slice(0, -1);
          break;
        default:
          password += char;
          break;
      }
    };
    stdin.on("data", onData);
  });
}
