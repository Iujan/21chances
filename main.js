const fs = require('fs');
const path = require('path');

const outputDir = "./output";

function obfuscateNumber(n) {
  return "0x" + n.toString(16);
}

function obfuscateString(str) {
    const obfuscatedArr = Array.from(str)
      .map((char) => {
        const binary = char.charCodeAt(0).toString(2).padStart(8, "0");
        const group1 = parseInt(binary.slice(0, 4), 2).toString(16);
        const group2 = parseInt(binary.slice(4, 8), 2).toString(16);
        return `0x${group1}${group2}`;
      });
      
    const obfuscatedStr = obfuscatedArr.map((hex) => `string.char(${hex})`).join("..");
    
    return "(" + obfuscatedStr + ")";
}    
  
function obfuscateVariableName(name) {
  let newName = "__V";
  for (let i = 0; i < name.length; i++) {
    newName += String.fromCharCode(name.charCodeAt(i) + 1);
  }
  return newName.toUpperCase();
}

function obfuscateCode(code) {
  const lines = code.split("\n");
  const varMap = new Map();
  let newCode = "do\n";
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("local ")) {
      const parts = line.split("=");
      const varName = parts[0].substr(6).trim();
      const varValue = parts[1].trim();
      const newVarName = obfuscateVariableName(varName);
      varMap.set(varName, newVarName);
      if (/^\d+$/.test(varValue)) {
        const newVarValue = obfuscateNumber(parseInt(varValue));
        newCode += `    local ${newVarName} = ${newVarValue};\n`;
      } else if (/^"[^"]*"$/.test(varValue)) {
        const originalString = varValue.substring(1, varValue.length - 1);
        const newString = obfuscateString(originalString);
        newCode += `    local ${newVarName} = ${newString};\n`;
      } else {
        newCode += `    local ${newVarName} = ${varValue};\n`;
      }
    } else {
      for (let [varName, newVarName] of varMap) {
        line = line.split(varName).join(newVarName);
      }
      newCode += "    " + line + "\n";
    }
  }
  newCode += "end\n";
  return newCode;
}

function obfuscateLuaFile(file) {
  const input = fs.readFileSync(file, { encoding: 'utf-8' });
  const obfuscatedCode = obfuscateCode(input);
  const fileName = path.basename(file);
  const outputPath = path.join(outputDir, "jsobf." + fileName);
  fs.writeFileSync(outputPath, obfuscatedCode);
}

const input = "main.lua";
obfuscateLuaFile(input);
