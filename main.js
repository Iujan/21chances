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
  const illegalCharsRegex = /[^a-zA-Z0-9_$]/g;
  const suffix = '_21CHANCES';
  let newName = '_V';

  for (let i = 0; i < name.length; i++) {
    const charCode = name.charCodeAt(i);
    newName += String.fromCharCode(charCode + 1);
  }

  newName = newName.replace(/`/g, '_');
  newName = newName.replace(illegalCharsRegex, '');

  newName += suffix.replace(illegalCharsRegex, '_');

  return newName.toUpperCase();
}

function obfuscateCode(code) {
  const lines = code.split("\n");
  const varMap = new Map();
  const numMap = new Map();
  let newCode = "--[[ 21chances ]]\ndo ";
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("print") || line.startsWith("error") || line.startsWith("warn")) {
      const parts = line.split("(");
      const funcName = parts[0].trim();
      const obfuscatedFuncName = Array.from(funcName)
        .map((char) => `string.char(${char.charCodeAt(0)})`).join("..");
      const obfuscatedVarName = obfuscateVariableName(`var_${funcName}`);
      newCode += `local ${obfuscatedVarName}=getgenv()[${obfuscatedFuncName}];`;
      line = line.replace(funcName, obfuscatedVarName);
    }
    if (line.startsWith("local ")) {
      const parts = line.split("=");
      const varName = parts[0].substr(6).trim();
      const varValue = parts[1].trim();
      const newVarName = obfuscateVariableName(varName);
      varMap.set(varName, newVarName);
      if (/^\d+$/.test(varValue)) {
        const numValue = parseInt(varValue);
        const newVarValueName = obfuscateVariableName("num_" + numValue);
        numMap.set(numValue, newVarValueName);
        const randomValue = Math.floor(Math.random() * -2001) - 200;
        newCode += `local ${newVarValueName}=${randomValue};`;
        newCode += `local ${newVarName}=${newVarValueName};`;
        newCode += `while ((${newVarName})<(${obfuscateNumber(numValue)})) do ${newVarName}=(${newVarName}+(0x5-0x4));end;`;
      } else if (/^"[^"]*"$/.test(varValue)) {
        const originalString = varValue.substring(1, varValue.length - 1);
        const newString = obfuscateString(originalString);
        newCode += `local ${newVarName}=${newString};`;
      } else {
        newCode += `local ${newVarName}=${varValue};`;
      }
    } else {
      for (let [varName, newVarName] of varMap) {
        line = line.split(varName).join(newVarName);
      }
      for (let [numValue, newVarValueName] of numMap) {
        const newVarValue = numValue == 0 ? 1 : numValue;
        line = line.split(numValue.toString()).join(newVarValueName);
      }
      newCode += line;
    }
  }
  newCode += "end;";
  return newCode;
}

function obfuscateLuaFile(file) {
  const input = fs.readFileSync(file, { encoding: 'utf-8' });
  const obfuscatedCode = obfuscateCode(input);
  const fileName = path.basename(file);
  const outputPath = path.join(outputDir, "21chnc." + fileName);
  fs.writeFileSync(outputPath, obfuscatedCode);
}

const input = "main.lua";
obfuscateLuaFile(input);
