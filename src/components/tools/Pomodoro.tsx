import { useState, useEffect, use, useRef, useLayoutEffect } from "react";
import gsap from 'gsap';
import Button from '../base/Button';
import ButtonLink from '../base/ButtonLink';
import { HugeiconsIcon } from '@hugeicons/react';
import { Briefcase01Icon, Coffee02Icon, Moon02Icon, PlayIcon, PauseIcon, Refresh01Icon, Settings02Icon, RepeatIcon, FastForwardIcon } from '@hugeicons/core-free-icons';
import PomodoroModal from "../base/PomodoroModal";
export default function Pomodoro() {

    const colorClasses = {
        green: 'text-green',
        yellow: 'text-yellow',
        red: 'text-red',
      }

    const [timerDurations, setTimerDurations] = useState({
        work: 25 * 60,
        break: 5 * 60,
        longBreak: 15 * 60
    })

    let isLocalStorage = localStorage.getItem('pomodoro') ? true : false;
    let localStorageData = isLocalStorage ? JSON.parse(localStorage.getItem('pomodoro')) : null
    const [status, setStatus] = useState<'work' | 'break' | 'longBreak'>(isLocalStorage ? localStorageData.status : 'work');
    const [timer, setTimer] = useState(isLocalStorage ? localStorageData.timer : 25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [timesCount, setTimesCount] = useState(isLocalStorage ? localStorageData.timesCount : 0);
    const [maxTimesCount, setMaxTimesCount] = useState(isLocalStorage ? localStorageData.maxTimesCount : 4);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [timerColor, setTimerColor] = useState<'green' | 'yellow' | 'red'>('green');    

    const timerCharEls = useRef<(HTMLSpanElement | null)[]>([]);
    const prevTimerChars = useRef<string[]>([]);
    const timerDurationsFirst = useRef(true);
    const containerRef   = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        gsap.from(Array.from(containerRef.current.children), {
          opacity: 0, y: 24, duration: 0.5, ease: 'power3.out', stagger: 0.08, clearProps: 'all',
        });
      }, []);
    

    useEffect(() => {
            localStorage.setItem('pomodoro', JSON.stringify({
                status,
                timer,
                timesCount,
                maxTimesCount
            }))
    }, [timer, status, maxTimesCount, timesCount, timerDurations])

    useEffect(() => {
        const chars = `${formatTime(timer)[0]}:${formatTime(timer)[1]}`.split('');

        chars.forEach((char, i) => {
            const el = timerCharEls.current[i];
            if (!el) return;
            if (char === prevTimerChars.current[i]) return;

            gsap.killTweensOf(el);
            gsap.fromTo(el,
                { y: 10, rotateX: -90, opacity: 0 },
                { y: 0, rotateX: 0, opacity: 1, duration: 0.28, ease: 'back.out(1.4)', transformPerspective: 300 }
            );
        });

        prevTimerChars.current = chars;
    }, [timer]);

    useEffect(() => {

        if (isRunning) {
            const timerInterval = setInterval(() => {
                setTimer(prevTimer => prevTimer-1)
            }, 1000)

            return () => {
                clearInterval(timerInterval)
            }
        }

    }, [isRunning])

    useEffect(() => {

        if (timer === 0){
            if (status === 'work'){
                if (timesCount+1 < maxTimesCount) {
                    setStatus('break');
                    setTimer(timerDurations.break);
                    setTimesCount(prevTimes => prevTimes+1)
                }else{
                    setStatus('longBreak');
                    setTimer(timerDurations.longBreak);
                    setTimesCount(0);
                }
            }if (status === 'break'){
                setStatus('work');  
                setTimer(timerDurations.work);                
            }if (status === 'longBreak'){
                setStatus('work');
                setTimer(timerDurations.work);                
            }
        }else{
            let duration = 0;
            if (status === 'work') duration = timerDurations.work 
            if (status === 'break') duration = timerDurations.break 
            if (status === 'longBreak') duration = timerDurations.longBreak
            
            if (((timer * 100) / duration) > 50) setTimerColor('green')
            if (((timer * 100) / duration) > 10 && ((timer * 100) / duration) < 50) setTimerColor('yellow')
            if (((timer * 100) / duration) < 10) setTimerColor('red')
        }

    }, [timer])

    useEffect(() => {
        if (timerDurationsFirst.current) { timerDurationsFirst.current = false; return; }
        if (status === 'work') setTimer(timerDurations.work)
        if (status === 'break') setTimer(timerDurations.break)
        if (status === 'longBreak') setTimer(timerDurations.longBreak)
    }, [timerDurations])
    

    function pauseResume(){
        setIsRunning(prev => !prev);
    }

    function restart(){
        setStatus('work');
        setIsRunning(false);
        setTimer(timerDurations.work);
    }

    function skipCycle(){
        setTimer(0);
    }

    
    function formatTime(time: number) {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;

        let minutesString = minutes.toString()
        let secondsString = seconds.toString()

        if (minutesString.length === 1) minutesString = "0" + minutesString
        if (secondsString.length === 1) secondsString = "0" + secondsString
        
        return [minutesString, secondsString]
    }
    

    function closeModal(){
        setIsSettingsModalOpen(false)
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
                <h1 className="text-4xl font-bold text-center mb-6">Pomodoro</h1>
                <p className="text-center text-dark/60 mb-10">Time your work and breaks with
                    <ButtonLink
                        className="ml-2"
                        variant="link"
                        href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
                    >
                        Pomodoro technique
                    </ButtonLink>
                </p>
                
                <div className="flex flex-col items-center justify-center">
                    
                    <div className="flex gap-4 mb-8">
                        <Button
                            variant={`${status === 'work' ? 'primary' : 'ghost'}`}
                            className={`px-4 rounded-3xl ${status === 'work' ? 'bg-green !text-dark' : ''}`}
                            onClick={() => { setStatus('work'); setTimer(timerDurations.work); }}
                        >
                            <HugeiconsIcon icon={Briefcase01Icon} size={16} />
                            Work
                        </Button>
                        <Button
                            variant={`${status === 'break' ? 'primary' : 'ghost'}`}
                            className={`px-4 rounded-3xl ${status === 'break' ? 'bg-yellow !text-dark' : ''}`}
                            onClick={() => { setStatus('break'); setTimer(timerDurations.break); }}
                        >
                            <HugeiconsIcon icon={Coffee02Icon} size={16} />
                            Short break
                        </Button>
                        <Button
                            variant={`${status === 'longBreak' ? 'primary' : 'ghost'}`}
                            className={`px-4 rounded-3xl ${status === 'longBreak' ? '!bg-blue !text-dark' : ''}`}
                            onClick={() => { setStatus('longBreak'); setTimer(timerDurations.longBreak); }}
                        >
                            <HugeiconsIcon icon={Moon02Icon} size={16} />
                            Long break
                        </Button>
                    </div>

                    <p className={`${colorClasses[timerColor]} text-7xl font-bold text-center mb-10`} style={{ perspective: 300 }}>
                    {`${formatTime(timer)[0]}:${formatTime(timer)[1]}`.split('').map((char, i) => (
                        <span
                            key={i}
                            ref={el => { timerCharEls.current[i] = el; }}
                            style={{ display: 'inline-block' }}
                        >
                            {char}
                        </span>
                    ))}
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <div className="flex gap-2">
                        <Button
                        variant="ghost"
                        onClick={skipCycle}
                        className={`'bg-light text-dark'`}
                        >
                            <HugeiconsIcon icon={FastForwardIcon} size={16} />
                        </Button>
                        <Button
                        onClick={pauseResume}
                        className={`w-[124px] transition-colors duration-150 hover:opacity-100 ${isRunning ? 'hover:bg-yellow hover:text-dark' : 'hover:bg-green hover:text-dark'}`}
                        >
                            {isRunning ? <HugeiconsIcon icon={PauseIcon} size={16} /> : <HugeiconsIcon icon={PlayIcon} size={16} />}
                            {isRunning ? 'Pause' : (status === 'work'  && timer !== timerDurations.work) || (status === 'break'  && timer !== timerDurations.break) || (status === 'longBreak'  && timer !== timerDurations.longBreak) ? 'Resume' : 'Start'}
                        </Button>
                        <Button
                        onClick={restart}
                        className={`transition-colors duration-150 hover:opacity-100 ${timer === timerDurations.work || timer === timerDurations.break || timer === timerDurations.longBreak ? 'bg-dark/10 text-dark' : 'hover:bg-red hover:text-dark'}`}
                        disabled={timer === timerDurations.work || timer === timerDurations.break || timer === timerDurations.longBreak}
                        >
                            <HugeiconsIcon icon={Refresh01Icon} size={16} />
                            Reset
                        </Button>
                        <Button
                        variant="ghost"
                        onClick={() => setIsSettingsModalOpen(true)}
                        className={`'bg-light text-dark'`}
                        >
                            <HugeiconsIcon icon={Settings02Icon} size={16} />
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-center">
                    <p className="text-sm text-dark/50">
                        {`Cycles done: ${timesCount}/${maxTimesCount}`}
                    </p>
                </div>

            <PomodoroModal
                isOpen={isSettingsModalOpen}
                onClose={closeModal}
                maxTimesCount={maxTimesCount}
                setMaxTimesCount={setMaxTimesCount}
                formatTime={formatTime}
                timerDurations={timerDurations}
                setTimerDurations={setTimerDurations}
            />
            
        </div>
    )
}