#!/usr/bin/env node

const argv = require("minimist")(process.argv.slice(2));
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const special_require_pattern = /^----[ \t]*require[ \t]*"((?:[^"]|\\.)*)"$/;
function lua_require(code, file, seen) {
  return code.replace(special_require_pattern, function(_, filename) {
      if(!seen.hasOwnProperty(filename)) {
        seen[filename] = true;
        const new_source = path.join(path.dirname(file), filename);
        const contents = fs.readFileSync(new_source).toString();
        return lua_require(contents, new_source, seen);
      } else {
        return "";
      }
    });
}

function luamin(code) {
  const bin_path = child_process.spawnSync("npm", ["bin"], {
    cwd: __dirname
  });
  if (bin_path.status !== 0) {
    console.log(bin_path);
    throw("fatal: npm bin failed");
  }

  const res = child_process.spawnSync(path.join(bin_path.stdout.toString().trim(), "luamin"), ["-c"], {
    input: code
  });

  if(res.status !== 0) {
    console.log(res);
    throw("fatal: luamin failed");
  }

  return res.stdout.toString();
}

var source_cart = argv._[0];
var output_cart = argv._[1];
if (source_cart == null) {
  throw("Pass the path to the source cart as the first argument.");
}
if (output_cart == null) {
  throw("Pass the path to the output cart as the second argument.");
}
source_cart = path.resolve(source_cart);
output_cart = path.resolve(output_cart);

const cart_lua = /^(?<=__lua__\n)([\s\S]*?)(?=\n__[a-z]+__|(?!.))$/m;
var cart_contents = fs
    .readFileSync(source_cart)
    .toString()
    .replace(cart_lua, function(_, code) {
      return luamin(lua_require(code, source_cart, {})).trim();
    });

fs.writeFileSync(output_cart, cart_contents);
