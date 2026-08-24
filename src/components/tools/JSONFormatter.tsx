import { useEffect, useState, useRef, useLayoutEffect } from "react"
import ButtonLink from "../base/ButtonLink";
import Button from "../base/Button";
import gsap from 'gsap';



export default function JSONFormatter() {
    const [jsonInput, setJsonInput] = useState('');
    const [jsonOutput, setJsonOutput] = useState('');
    const [mode, setMode] = useState<'basic' | 'scanner'>('basic');
    const [status, setStatus] = useState({
        isValid: false,
        error: {
            title: '',
            message: '',
            position: [0, 0],
            index: 0,
            unexpectedToken: ''
        },
    });
    const containerRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [charMetrics, setCharMetrics] = useState({ width: 8.4, height: 20 });
    const [scrollPos, setScrollPos] = useState({ top: 0, left: 0 });


    useLayoutEffect(() => {
        if (!containerRef.current) return;
        gsap.from(Array.from(containerRef.current.children), {
          opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'all',
        });
      }, []);

    // Measures the exact pixel size of one monospace character, so the error
    // highlight can be positioned without duplicating/rendering the text itself.
    useEffect(() => {
        if (measureRef.current) {
            const rect = measureRef.current.getBoundingClientRect();
            setCharMetrics({ width: rect.width, height: rect.height });
        }
    }, []);



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
                message: "No opening quote.",
                endIndex: startIndex
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
                        message: "Invalid escape sequence.",
                        endIndex: startIndex+i
                    }
                }
            }

            if (c === "\"") {
                return {
                    valid: true,
                    message: "",
                    endIndex: startIndex+i+1
                }
            }

            // JSON strings cannot contain a literal control character (e.g. a raw
            // newline or tab) - it must be escaped instead (\n, \t...).
            if (c.charCodeAt(0) < 0x20) {
                return {
                    valid: false,
                    message: "Strings cannot contain an unescaped control character (like a newline or tab).",
                    endIndex: startIndex+i
                }
            }
        }

        return {
            valid: false,
            message: "No closing quote.",
            endIndex: startIndex+s.length
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

    function parseLiteral(s: string, startIndex: number){
        const literals = ["true", "false", "null"];

        for (const literal of literals) {
            if (s.slice(0, literal.length) === literal) {
                return {
                    valid: true,
                    message: "",
                    endIndex: startIndex + literal.length
                }
            }
        }

        return {
            valid: false,
            message: "Invalid literal.",
            endIndex: startIndex
        }
    }

    function parseValue(s: string, startIndex: number){
        const c = s[0];

        if (c === "\"") return parseString(s, startIndex);
        if (/[0-9-]/.test(c)) return parseNumber(s, startIndex);
        if (c === "[") return parseArray(s, startIndex);
        if (c === "{") return parseObject(s, startIndex);
        if (c === "t" || c === "f" || c === "n") return parseLiteral(s, startIndex);

        return {
            valid: false,
            message: "Unexpected character, expected a value.",
            endIndex: startIndex
        }
    }

    function parseArray(s: string, startIndex: number){

        let i = 0;

        while (i < s.length){

            // First char isn't [
            if (i === 0 && s[i] !== "[") return {
                valid: false,
                message: "Array not opening with [",
                endIndex: startIndex+i
            }

            if (i === 0 && s[i] === "[") {
                i++;
                continue;
            }

            let w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] !== "]" && s[i] !== ",") {
                const res = parseValue(s.slice(i), startIndex+i)
                if (!res.valid) return res
                else{
                    i = res.endIndex - startIndex
                    continue;
                }
            }

            w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] === ",") {
                i++;

                w = skipWhitespace(s.slice(i), startIndex+i)
                if (w || w === 0) i = w - startIndex

                if (s[i] === "]") return {
                    valid: false,
                    message: "Trailing comma before ]",
                    endIndex: startIndex+i
                }

                continue;
            }
            else if (s[i] === "]") return {
                valid: true,
                message: "",
                endIndex: startIndex+i+1
            }
            else return {
                valid: false,
                message: "Malformed array",
                endIndex: startIndex+i
            }
        }

        return {
            valid: false,
            message: "Array not closed with ]",
            endIndex: startIndex + i
        }
    }

    function parseObject(s: string, startIndex: number){

        let i = 0;

        while (i < s.length){
            let lastCharisComma = false

            // First char isn't {
            if (i === 0 && s[i] !== "{") return {
                valid: false,
                message: "Object not opening with {",
                endIndex: startIndex+i
            }

            if (i === 0 && s[i] === "{") {
                i++;
                let w = skipWhitespace(s.slice(i), startIndex+i)
                if (w || w === 0) i = w - startIndex

                if (s[i] === "}") return {
                    valid: true,
                    message: "",
                    endIndex: startIndex+i+1
                }
                else continue;  
            }


            // Key

            let w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] !== "}" && s[i] !== ",") {
                let res = parseString(s.slice(i), startIndex+i)
                if (!res.valid) return res
                else {
                    i = res.endIndex - startIndex
                }
            }

            
            // :

            w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] !== ":") return {
                valid: false,
                message: "Object malformed, no ':' found",
                endIndex: startIndex+i
            } 
            else {
                i++;
            }

            
            // Value

            w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            lastCharisComma = false
            let res = parseValue(s.slice(i), startIndex+i)
            if (!res.valid) return res
            else {
                i = res.endIndex - startIndex
            }

            // Comma            
            
            w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] === ",") {
                i++;

                w = skipWhitespace(s.slice(i), startIndex+i)
                if (w || w === 0) i = w - startIndex

                if (s[i] === "}") return { 
                    valid:false, 
                    message:"Trailing comma before }", 
                    endIndex: startIndex+i 
                };

                continue;
            }

            w = skipWhitespace(s.slice(i), startIndex+i)
            if (w || w === 0) i = w - startIndex

            if (s[i] === "}") return {
                valid: true,
                message: "",
                endIndex: startIndex+i+1
            }
            
            else return {
                valid: false,
                message: "Malformed object",
                endIndex: startIndex+i
            }
        }

        return {
            valid: false,
            message: "Object not closed with }",
            endIndex: startIndex + i
        }
    }

    // Converts an absolute character index into a 1-based [line, column] pair.
    function indexToLineColumn(input: string, index: number){
        let line = 1;
        let column = 1;

        for (let i = 0; i < index && i < input.length; i++){
            if (input[i] === "\n") {
                line++;
                column = 1;
            } else {
                column++;
            }
        }

        return [line, column];
    }

    // Scanner mode entry point: runs the hand-rolled parser instead of JSON.parse,
    // so an invalid JSON gives back the exact position of the syntax error.
    function scanJSON(input: string){
        const startPos = skipWhitespace(input, 0);

        if (startPos === undefined) {
            return {
                valid: false,
                message: "Empty input.",
                endIndex: 0
            }
        }

        const result = parseValue(input.slice(startPos), startPos);
        if (!result.valid) return result;

        const trailingPos = skipWhitespace(input.slice(result.endIndex), result.endIndex);
        if (trailingPos !== undefined) {
            return {
                valid: false,
                message: "Unexpected content after the JSON value.",
                endIndex: trailingPos
            }
        }

        return result;
    }


    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (mode === 'scanner') {
            const scanResult = scanJSON(jsonInput);

            if (!scanResult.valid) {
                const errorIndex = scanResult.endIndex ?? 0;
                const [scanLine, scanColumn] = indexToLineColumn(jsonInput, errorIndex);

                setStatus({
                    isValid: false,
                    error: {
                        title: 'Invalid JSON',
                        message: scanResult.message,
                        position: [scanLine, scanColumn],
                        index: errorIndex,
                        unexpectedToken: ''
                    },
                });
                setJsonOutput('');
                return;
            }

            try {
                const parsedJson = JSON.parse(jsonInput);
                setStatus({
                    isValid: true,
                    error: { title: '', message: '', position: [0, 0], index: 0, unexpectedToken: '' },
                });
                setJsonOutput(JSON.stringify(parsedJson, null, 2));
            } catch {
                setStatus({
                    isValid: false,
                    error: {
                        title: 'Unexpected mismatch',
                        message: 'The scanner accepted this JSON but the native parser rejected it.',
                        position: [0, 0],
                        index: 0,
                        unexpectedToken: ''
                    },
                });
                setJsonOutput('');
            }
            return;
        }

        try {
            const parsedJson = JSON.parse(jsonInput);
            setStatus({
                isValid: true,
                error: {
                    title: '',
                    message: '',
                    position: [0, 0],
                    index: 0,
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
                    index: 0,
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
        <div ref={containerRef} className="max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center items-center">
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

            {/* Mode toggle */}
            <div className="w-full max-w-4xl mb-4 flex items-center gap-2">
                <div className="flex gap-1 bg-dark/5 rounded-xl p-1">
                    <button
                        type="button"
                        onClick={() => setMode('basic')}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                            mode === 'basic' ? 'bg-light text-dark' : 'text-dark/40 hover:text-dark/70'
                        }`}
                    >
                        Basic
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('scanner')}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                            mode === 'scanner' ? 'bg-light text-dark' : 'text-dark/40 hover:text-dark/70'
                        }`}
                    >
                        Scanner
                    </button>
                </div>
                <span className="text-xs text-dark/40">
                    {mode === 'basic' ? "Uses the browser's own JSON parser." : 'Uses a hand-rolled scanner that locates the exact error position.'}
                </span>
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
                    <div className="relative rounded-2xl border-2 border-transparent bg-dark/5 overflow-hidden">
                        {/* Off-screen span used only to measure one monospace character */}
                        <span
                            ref={measureRef}
                            className="invisible absolute top-0 left-0 p-0 m-0 text-sm font-mono whitespace-pre pointer-events-none"
                        >M</span>

                        {mode === 'scanner' && !status.isValid && status.error.message !== '' && (
                            <div
                                className="absolute bg-red-400/50 rounded-sm pointer-events-none transition-all duration-150"
                                style={{
                                    top: 16 + (status.error.position[0] - 1) * charMetrics.height - scrollPos.top,
                                    left: 16 + Math.max(0, status.error.position[1] - 2) * charMetrics.width - scrollPos.left,
                                    width: charMetrics.width * 3,
                                    height: charMetrics.height,
                                }}
                            />
                        )}

                        <textarea
                            ref={inputRef}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            onScroll={(e) => setScrollPos({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })}
                            placeholder='{ "hello": "world" }'
                            spellCheck={false}
                            className="relative w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-dark/40 px-1">Output</span>
                    {!status.isValid && status.error.message ? (
                        <div className="w-full h-96 rounded-2xl bg-red-500/5 border-2 border-red-400/60 p-4 overflow-auto">
                            <p className="text-sm font-bold text-red-500">{status.error.title}</p>
                            <p className="text-xs text-red-500/80 mt-1">{status.error.message}</p>
                            {
                                status.error.unexpectedToken !== '' ?
                                <p className="text-xs text-red-500/60 mt-2">
                                    Unexpected token: {status.error.unexpectedToken}
                                </p>
                                :
                                <p className="text-xs text-red-500/60 mt-2">
                                    Line {status.error.position[0]}, column {status.error.position[1]}
                                </p>
                            }
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-dark/5">
                            <textarea
                                value={jsonOutput}
                                readOnly
                                placeholder="The formatted JSON will appear here"
                                spellCheck={false}
                                className="w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                            />
                        </div>
                    )}
                </div>
            </form>

        </div>
    )
}
