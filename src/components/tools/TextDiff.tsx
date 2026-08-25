import { useState, useRef, useLayoutEffect } from "react";
import ButtonLink from "../base/ButtonLink";
import Button from "../base/Button";
import gsap from 'gsap';

export default function TextDiff() {
    const containerRef   = useRef<HTMLDivElement>(null);
    const [textA, setTextA] = useState('');
    const [textB, setTextB] = useState('');

    const [diffResultA, setDiffResultA] = useState<{ type: 'igual' | 'borrada' | 'insertada'; text: string, id: number, chars?: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] }[]>([]);
    const [diffResultB, setDiffResultB] = useState<{ type: 'igual' | 'borrada' | 'insertada'; text: string, id: number, chars?: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] }[]>([]);


    useLayoutEffect(() => {
        if (!containerRef.current) return;
        gsap.from(Array.from(containerRef.current.children), {
          opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'all',
        });
      }, []);

    function handleCompare(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const r = compareLines(textA, textB)
        const blocks = getBlocks(r.resultA, r.resultB);
        blocks.forEach(block => {
            const pairs = getPairs(block);
            pairs.forEach(pair => {
                if (pair.length === 2){
                    const charRes = compareChars(pair[0].text, pair[1].text)
                    r.resultA[pair[0].id]["chars"] = charRes.resultA
                    r.resultB[pair[1].id]["chars"] = charRes.resultB
                }
            });
        });

        setDiffResultA(r.resultA);
        setDiffResultB(r.resultB);
    }

    function compareLines(tA: string, tB: string){
        const resultA: { type: 'igual' | 'borrada' | 'insertada'; text: string, id: number, chars?: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] }[] = [];
        const resultB: { type: 'igual' | 'borrada' | 'insertada'; text: string, id: number, chars?: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] }[] = [];
        const linesA = ["0", ...tA.split(/\r?\n|\r/)];
        const linesB = ["0", ...tB.split(/\r?\n|\r/)];

        let table = new Array;
        let r = 0;
        let c = 0;

        for (let i = 0; i < linesA.length ; i++) {
            table[i] = [];

            for (let j = 0; j < linesB.length; j++){

                if (i === 0 || j === 0){
                    table[i][j] = 0;
                }else{
                    if (linesA[i] === linesB[j]){
                        table[i][j] = table[i-1][j-1]+1;
                    }else{

                        if (table[i-1][j] > table[i][j-1]){
                            table[i][j] = table[i-1][j]
                        }else{
                            table[i][j] = table[i][j-1]
                }}}
                c = j;
            }
            r = i;
        }

        while(true){
            if (r === 0 && c === 0) break;
            if (r === 0 && c > 0) {
                resultB.push({type: "insertada", text: linesB[c], id: c})
                c--;
                continue;
            }
            if (c === 0 && r > 0) {
                resultA.push({type: "borrada", text: linesA[r], id: r})
                r--;
                continue;
            }
            if (linesA[r] === linesB[c]){
                resultA.push({type: "igual", text: linesA[r], id: r})
                resultB.push({type: "igual", text: linesB[c], id: c})
                r--;
                c--;
                continue;
            }else{
                if(table[r][c-1] >= table[r-1][c]){
                    resultB.push({type: "insertada", text: linesB[c], id: c})
                    c--;
                    continue;
                }else {
                    resultA.push({type: "borrada", text: linesA[r], id: r})
                    r--;
                    continue;
                }
            }
        }

        return {
            resultA: resultA.reverse(),
            resultB: resultB.reverse()
        }
    }

    function getBlocks (
        resultA: { type: 'igual' | 'borrada' | 'insertada'; text: string, id: number }[], 
        resultB: { type: 'igual' | 'borrada' | 'insertada'; text: string, id: number }[]){
        
            let blocks = [];
            let current: { insertadas: {text: string, id: number}[]; borradas: {text: string, id: number}[] } = { insertadas: [], borradas: [] };

            let iA = 0;
            let iB = 0;
            while (iA < resultA.length || iB < resultB.length){

                if ((iA < resultA.length && resultA[iA].type === "igual") &&
                    (iB < resultB.length && resultB[iB].type === "igual")){
                        
                        if (current.borradas.length > 0 || current.insertadas.length > 0){
                            blocks.push({...current})
                            current.insertadas = []
                            current.borradas = []
                        }
                        iA++;
                        iB++;
                        continue;
                    }

                if (iA < resultA.length && resultA[iA].type === "borrada"){
                    current.borradas.push({text: resultA[iA].text, id: iA});
                    iA++;
                }

                if (iB < resultB.length && resultB[iB].type === "insertada"){
                    current.insertadas.push({text:resultB[iB].text, id: iB});
                    iB++;
                }
            }
            
            if (current.borradas.length > 0 || current.insertadas.length > 0){
                blocks.push({...current})
                current.insertadas = []
                current.borradas = []
            }
            
            return blocks;
    }

    function getPairs (block: { insertadas: {text: string, id: number}[]; borradas: {text: string, id: number}[] }){
        let pairs = [];
        let deleted = [...block.borradas];
        let inserted = [...block.insertadas];

        while (deleted.length > 0 && inserted.length > 0){

            let best = { j: -1, score: -1 };

            for (let j = 0; j < deleted.length; j++){        
                const score = comparePreffix(inserted[0].text, deleted[j].text) + compareSuffix(inserted[0].text, deleted[j].text);
                if (score > best.score) {
                    best = { j, score };
                }
            }

            pairs.push([deleted[best.j], inserted[0]])
            deleted.splice(best.j, 1)
            inserted.splice(0, 1)
        }

        if (deleted.length > 0){
            deleted.forEach(l => {
                pairs.push([l])                
            });
        }

        if (inserted.length > 0){
            inserted.forEach(l => {
                pairs.push([l])                
            });
        }

        return pairs;
    }

    function compareChars (lineA: string, lineB: string){
        const resultA: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] = [];
        const resultB: { type: 'igual' | 'borrada' | 'insertada'; text: string }[] = [];
        const charsA = lineA.split('');
        const charsB = lineB.split('');
        charsA.unshift("0")
        charsB.unshift("0")
        
        let table = new Array;
        let r = 0;
        let c = 0;
        
        for (let i = 0; i < charsA.length ; i++) {
            table[i] = [];

            for (let j = 0; j < charsB.length; j++){

                if (i === 0 || j === 0){
                    table[i][j] = 0;
                }else{
                    if (charsA[i] === charsB[j]){
                        table[i][j] = table[i-1][j-1]+1;
                    }else{

                        if (table[i-1][j] > table[i][j-1]){
                            table[i][j] = table[i-1][j]
                        }else{
                            table[i][j] = table[i][j-1]
                }}}
                c = j;
            }
            r = i;
        }

        while(true){
            if (r === 0 && c === 0) break;
            if (r === 0 && c > 0) {
                resultB.push({type: "insertada", text: charsB[c]})
                c--;
                continue;
            }
            if (c === 0 && r > 0) {
                resultA.push({type: "borrada", text: charsA[r]})
                r--;
                continue;
            }
            if (charsA[r] === charsB[c]){
                resultA.push({type: "igual", text: charsA[r]})
                resultB.push({type: "igual", text: charsB[c]})
                r--;
                c--;
                continue;
            }else{
                if(table[r][c-1] >= table[r-1][c]){
                    resultB.push({type: "insertada", text: charsB[c]})
                    c--;
                    continue;
                }else {
                    resultA.push({type: "borrada", text: charsA[r]})
                    r--;
                    continue;
                }
            }
        }

        return {
            resultA: resultA.reverse(),
            resultB: resultB.reverse()
        }
    }

    function comparePreffix (a: string, b: string){
        let i = 0;
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        return i;
    }

    function compareSuffix (a: string, b: string){
        let i = 0;
        while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
        return i;
    }

    function handleClear() {
        setTextA('');
        setTextB('');
        setDiffResultA([]);
        setDiffResultB([]);
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
                <h1 className="text-4xl font-bold text-center mb-6">Text Diff</h1>
                <p className="text-center text-dark/60 mb-10">Compare two texts and see what changed between them</p>
            </div>

            {/* Action bar */}
            <div className="w-full max-w-4xl mb-4 flex flex-wrap items-center gap-2">
                <Button type="submit" form="text-diff-form" variant="primary">
                    Compare
                </Button>

                <div className="flex-1" />

                <Button type="button" variant="ghost" onClick={handleClear}>
                    Clear
                </Button>
            </div>

            {/* Input panels */}
            <form id="text-diff-form" onSubmit={handleCompare} className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-dark/40 px-1">Original</span>
                    <div  className="rounded-2xl bg-dark/5">
                        {
                            diffResultA.length === 0 ?
                        
                        (<textarea
                            value={textA}
                            onChange={(e) => setTextA(e.target.value)}
                            placeholder="Paste the original text here"
                            spellCheck={false}
                            className="w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                        />)
                        
                        :

                        (
                            <pre className="text-sm font-mono whitespace-pre-wrap w-full h-96 p-4 overflow-y-auto">
                                {diffResultA.map((line, i) => (
                                    <div
                                        key={i}
                                        className={
                                            line.type === 'insertada'
                                                ? 'bg-green-500/10 text-green-700'
                                                : line.type === 'borrada'
                                                ? 'bg-red-500/10 text-red-700'
                                                : 'text-dark'
                                        }
                                    >
                                        {
                                        line.type === 'igual' || !line.chars ?
                                            <span>{line.text}</span>
                                        :
                                        line.chars?.map((char, i) => (
                                            <span
                                                key={i}
                                                className={
                                                    char.type === 'borrada'
                                                        ? 'underline'
                                                        : ''
                                                }
                                            >
                                                {char.text}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </pre>
                        ) 
                        }
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-dark/40 px-1">Modified</span>
                    <div className="rounded-2xl bg-dark/5">
                        {
                            diffResultB.length === 0 ?
                        
                        (<textarea
                            value={textB}
                            onChange={(e) => setTextB(e.target.value)}
                            placeholder="Paste the modified text here"
                            spellCheck={false}
                            className="w-full h-96 resize-none bg-transparent p-4 text-sm font-mono text-dark placeholder:text-dark/20 focus:outline-none rounded-2xl"
                        />)
                        
                        :

                        (
                            <pre className="text-sm font-mono whitespace-pre-wrap w-full h-96 p-4 overflow-y-auto">
                                {diffResultB.map((line, i) => (
                                    <div
                                        key={i}
                                        className={
                                            line.type === 'insertada'
                                                ? 'bg-green-500/10 text-green-700'
                                                : line.type === 'borrada'
                                                ? 'bg-red-500/10 text-red-700'
                                                : 'text-dark'
                                        }
                                    >
                                        {
                                        line.type === 'igual' || !line.chars ?
                                            <span>{line.text}</span>
                                        :
                                        
                                        line.chars?.map((char, i) => (
                                            <span
                                                key={i}
                                                className={
                                                    char.type === 'insertada'
                                                        ? 'underline'
                                                        : ''
                                                }
                                            >
                                                {char.text}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </pre>
                        ) 
                        }
                    </div>
                </div>
            </form>
        </div>
    )
}
