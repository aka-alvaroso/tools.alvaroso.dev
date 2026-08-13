import { useEffect, useState, useRef } from "react"
import ButtonLink from "../base/ButtonLink";
import Button from "../base/Button";


export default function JSONFormatter() {
    const [jsonInput, setJsonInput] = useState('');
    const [jsonOutput, setJsonOutput] = useState('');
    const [status, setStatus] = useState({
        isValid: false,
        error: {
            title: '',
            message: '',
            position: [0, 0],
            unexpectedToken: ''
        },
    });
    const statusFirst = useRef(true);
    const fileInputRef = useRef<HTMLInputElement>(null);


   
    function skipWhitespace(s: string, startIndex: number){
        const charCodes = ["\x20", "\x09", "\x0A", "\x0D"]

        for (let i=0; i < s.length; i++){
            if (charCodes.includes(s[i])) continue
            else return startIndex+i
        }
    }

    function parseString(s: string, startIndex: number){
        const validEscapes = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'];

        if (s[0] !== "\"") {
            return {
                valid: false,
                message: "No opening quote."
            }
        }

        for (let i = 1; i < s.length; i++){
            let c = s[i]
            if (c === "\\" && validEscapes.includes(s[i+1])) {
                i++;
                continue;
            }else{
                if (c === "\\") {
                    return {
                        valid: false,
                        message: "Invalid escape sequence."
                    }
                }
            }

            if (c === "\"") {
                return {
                    valid: true,
                    message: "",
                    endIndex: startIndex+i
                }
            }
        }

        return {
            valid: false,
            message: "No closing quote."
        }
    }

    function parseNumber(s: string, startIndex: number){

        let hasExponential = false;
        let hasFractorial = false;
        
        for (let i = 0; i < s.length; i++){

            // ======= BASICS =======
            
            if (/[0-9-.+eE]/.test(s[i]) === false) return {
                valid: true,
                message: "",
                endIndex: startIndex+i     
            }
            
            // If not first char is "-" or "+" and there isn't previous exponential, invalid number
            if (i !== 0 && /[-+]/.test(s[i]) && /[eE]/.test(s[i-1]) === false) return {
                valid: false,
                message: "The '+' or '-' sign can only appear right after 'e'/'E'.",
                endIndex: startIndex+i
            }

            // If first char is "+", invalid number
            if (i === 0 && /[+]/.test(s[i])) return {
                valid: false,
                message: "A number cannot start with '+'.",
                endIndex: startIndex+i
            }

            // If first char is 0 or first char before "-" is 0
            if ((i === 0 && /[0]/.test(s[i]) && /[0-9]/.test(s[i+1])) || (i === 0 && /[-]/.test(s[i]) && /[0]/.test(s[i+1]) && /[0-9]/.test(s[i+2]))) return {
                valid: false,
                message: "Leading zeros are not allowed.",
                endIndex: startIndex+i
            }

            // ======= FRACTORIAL =======

            // If first char is . or not-first char is . and previous or next char is not a number
            if ((i === 0 && /[.]/.test(s[i])) || (/[.]/.test(s[i]) && /[0-9]/.test(s[i-1]) === false) || (/[.]/.test(s[i]) && /[0-9]/.test(s[i+1]) === false)) return {
                valid: false,
                message: "The decimal point must be surrounded by digits.",
                endIndex: startIndex+i
            }

            // A decimal point can never appear after the exponent has started
            if (hasExponential && /[.]/.test(s[i])) return {
                valid: false,
                message: "A decimal point is not allowed after the exponent.",
                endIndex: startIndex+i
            }

            if (hasFractorial && (/[.]/.test(s[i]))) return {
                valid: false,
                message: "A number can only have one decimal point.",
                endIndex: startIndex+i
            }

            if (!hasFractorial && (i !== 0 && /[.]/.test(s[i])) && /[0-9]/.test(s[i-1]) && /[0-9]/.test(s[i+1])) {
                hasFractorial = true;
            }


            // ======= EXPONENTIALS =======

            // If there is an exponential on first char, invalid
            if (i === 0 && /[eE]/.test(s[i])) return {
                valid: false,
                message: "A number cannot start with 'e' or 'E'.",
                endIndex: startIndex+i
            }

            // If there is an exponential and previous char is not a number or next char is not a number or + or -, invalid
            if ((i !== 0 && /[eE]/.test(s[i])) && (/[0-9]/.test(s[i-1]) === false || /[0-9-+]/.test(s[i+1]) === false)) return {
                valid: false,
                message: "'e'/'E' must be preceded by a digit and followed by a digit or a sign.",
                endIndex: startIndex+i
            }

            // If there is an exponential and next char is a - or + and next char is not a number, invalid
            if ((i !== 0 && /[eE]/.test(s[i])) && /[-+]/.test(s[i+1]) && /[0-9]/.test(s[i+2]) === false) return {
                valid: false,
                message: "The exponent sign must be followed by at least one digit.",
                endIndex: startIndex+i
            }

            if (hasExponential && /[eE]/.test(s[i])) return {
                valid: false,
                message: "A number can only have one exponent.",
                endIndex: startIndex+i
            }

            if (!hasExponential && /[eE]/.test(s[i]) && ((/[-+]/.test(s[i+1]) && /[0-9]/.test(s[i+2])) || /[0-9]/.test(s[i+1])))  {
                hasExponential = true 
            } 

        }

        return {
            valid: true,
            message: "",
            endIndex: startIndex+s.length
        } 
    }


    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            const parsedJson = JSON.parse(jsonInput);
            setStatus({
                isValid: true,
                error: {
                    title: '',
                    message: '',
                    position: [0, 0],
                    unexpectedToken: ''
                },
            });

            setJsonOutput(JSON.stringify(parsedJson, null, 2));



        }catch (error) {
            let isSyntaxError = error instanceof SyntaxError;

            let lineNumber = 0;
            let columnNumber = 0;
            let unexpectedToken = '';

            if (isSyntaxError) {
                const lineColummatch = (error as SyntaxError).message.match(/line (\d+) column (\d+)/);
                const unexpectedTokenMatch = (error as SyntaxError).message.match(/Unexpected token (\w+)/);
                console.log(unexpectedTokenMatch)

                if (lineColummatch) {
                    lineNumber = parseInt(lineColummatch[1]);
                    columnNumber = parseInt(lineColummatch[2]);
                }
                if (unexpectedTokenMatch) {
                    unexpectedToken = unexpectedTokenMatch[1];
                }
            }


            setStatus({
                isValid: false,
                error: {
                    title: error instanceof Error ? error.name : 'Error',
                    message: error instanceof Error ? error.message : 'Invalid JSON',
                    position: [lineNumber, columnNumber],
                    unexpectedToken: unexpectedToken
                },
            });
            setJsonOutput('');
        }
    }

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setJsonInput(e.target?.result as string);
            };
            reader.readAsText(file);
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center">
            <div className="w-full">
                <ButtonLink href="/" variant="ghost" className="group font-bold text-dark/50 hover:text-dark">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    className="group-hover:-translate-x-1 transition-transform duration-300">
                    <path d="M15 6C15 6 9.00001 10.4189 9 12C8.99999 13.5812 15 18 15 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/>
                </svg>
                All tools
            </ButtonLink>
            </div>
            <div className="w-full max-w-4xl">
                <h1 className="text-4xl font-bold text-center mb-6">JSON Formatter</h1>
                <p className="text-center text-dark/60 mb-10">Format JSON data for easy reading and debugging</p>
            </div>

            {/* Action bar */}
            <div className="w-full max-w-4xl mb-4 flex flex-wrap items-center gap-2">
                <Button type="submit" form="json-formatter-form" variant="primary">
                    Format
                </Button>

                <Button type="button" variant="secondary" onClick={() => {fileInputRef.current?.click();}}>
                    Import file
                </Button>
                <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileInput} />

                <div className="flex-1" />

                <Button type="button" variant="ghost" onClick={() => {navigator.clipboard.writeText(jsonOutput);}}>
                    Copy
                </Button>

                <Button type="button" variant="ghost" onClick={() => {setJsonInput(''); setJsonOutput('');}}>
                    Clear
                </Button>
            </div>

            {/* Panels */}
            <form id="json-formatter-form" onSubmit={handleSubmit} className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-dark/40 px-1">Input</span>
                    <div
                        className={`rounded-2xl border-2 transition-colors duration-200 ${
                            statusFirst.current || status.isValid
                                ? 'border-transparent bg-dark/5'
                                : 'border-red-400/60 bg-red-500/5'
                        }`}
                    >
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='{ "hello": "world" }'
                            spellCheck={false}
                            className="w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                        />
                    </div>

                    {!status.isValid && status.error.message && (
                        <div className="rounded-xl bg-red-500/5 border border-red-400/30 px-4 py-3">
                            <p className="text-sm font-bold text-red-500">{status.error.title}</p>
                            <p className="text-xs text-red-500/80 mt-0.5">{status.error.message}</p>
                            {
                                status.error.unexpectedToken !== '' ?
                                <p className="text-xs text-red-500/60 mt-1">
                                    Unexpected token: {status.error.unexpectedToken}
                                </p>
                                :
                                <p className="text-xs text-red-500/60 mt-1">
                                    Line {status.error.position[0]}, column {status.error.position[1]}
                                </p>
                            }
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-dark/40 px-1">Output</span>
                    <div className="rounded-2xl bg-dark/5">
                        <textarea
                            value={jsonOutput}
                            readOnly
                            placeholder="The formatted JSON will appear here"
                            spellCheck={false}
                            className="w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                        />
                    </div>
                </div>
            </form>

        </div>
    )
}
