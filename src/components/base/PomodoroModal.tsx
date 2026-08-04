import { HugeiconsIcon } from '@hugeicons/react';
import Modal from '../base/Modal';
import { Briefcase01Icon, Coffee02Icon, Moon02Icon, RepeatIcon } from '@hugeicons/core-free-icons';
import Button from './Button';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface Props {
    onClose: () => void;
    isOpen: boolean;
    maxTimesCount: number;
    setMaxTimesCount: (value: number) => void;
    formatTime: (time: number) => string[];
    timerDurations: {
        work: number,
        break: number,
        longBreak: number,
    };
    setTimerDurations: (value: {
        work: number,
        break: number,
        longBreak: number,
    } | ((prev: { work: number, break: number, longBreak: number }) => { work: number, break: number, longBreak: number })) => void;
}

export default function PomodoroModal({onClose: closeModal, isOpen: isSettingsModalOpen, maxTimesCount, setMaxTimesCount, formatTime, timerDurations, setTimerDurations}: Props) {


    const tabs = ['work', 'break', 'longBreak']
    const tabLabels = {
        'work': 'Work',
        'break': 'Break',
        'longBreak': 'Long Break'
    }
    const [tab, setTab] = useState<'work' | 'break' | 'longBreak' | 'cycles'>('work');
    const [durations, setDurations] = useState({
        work:      { minutes: parseInt(formatTime(timerDurations.work)[0]), seconds: parseInt(formatTime(timerDurations.work)[1]) },
        break:     { minutes: parseInt(formatTime(timerDurations.break)[0]),  seconds: parseInt(formatTime(timerDurations.break)[1]) },
        longBreak: { minutes: parseInt(formatTime(timerDurations.longBreak)[0]), seconds: parseInt(formatTime(timerDurations.longBreak)[1]) },
    });
    const [cycles, setCycles] = useState(maxTimesCount);


    function updateMinutes(key: 'work' | 'break' | 'longBreak', delta: number) {
      setDurations(prev => {
        const minutes = Math.min(99, Math.max(0, prev[key].minutes + delta));
        return {
            ...prev,
            [key]: { ...prev[key], minutes }
        };
      });
    }

    function updateSeconds(key: 'work' | 'break' | 'longBreak', delta: number) {
        setDurations(prev => {
          const current = prev[key];
          let seconds = current.seconds + delta;
          let minutes = current.minutes;
          if (seconds > 59) { seconds = 0; minutes += 1; }
          if (seconds < 0)  { seconds = 59; minutes = Math.max(0, minutes - 1); }
          return { ...prev, [key]: { minutes, seconds } };
        });
    }

    function padZero(n: number | string){
        n = n.toString();
        if (n.length === 1) return "0"+n
        else return n
    }

    const timerCharEls = useRef<any>({
        work: {
            minutes: [],
            seconds: []
        },
        break: {
            minutes: [],
            seconds: []
        },
        longBreak: {
            minutes: [],
            seconds: []
        }
    }); 
    const prevTimerChars = useRef<any>({
        work: {
            minutes: [],
            seconds: []
        },
        break: {
            minutes: [],
            seconds: []
        },
        longBreak: {
            minutes: [],
            seconds: []
        }
    });

    const cyclesCharEls = useRef<any>([]);
    const prevCyclesChars = useRef<any>([]);

    function animateDigits(chars: string[], els: any[], prevChars: string[]) {
        chars.forEach((char, i) => {
            const el = els[i];
            if (!el) return;
            if (char === prevChars[i]) return;

            gsap.killTweensOf(el);
            gsap.fromTo(el,
                { y: 10, rotateX: -90, opacity: 0 },
                { y: 0, rotateX: 0, opacity: 1, duration: 0.28, ease: 'back.out(1.4)', transformPerspective: 300 }
            );
        });
    }

    useEffect(() => {
        if (tab === 'cycles') return;
        const chars = padZero(durations[tab].minutes).split('');
        animateDigits(chars, timerCharEls.current[tab].minutes, prevTimerChars.current[tab].minutes);
        prevTimerChars.current[tab].minutes = chars;
    }, [tab, durations[tab === 'cycles' ? 'work' : tab].minutes])

    useEffect(() => {
        if (tab === 'cycles') return;
        const chars = padZero(durations[tab].seconds).split('');
        animateDigits(chars, timerCharEls.current[tab].seconds, prevTimerChars.current[tab].seconds);
        prevTimerChars.current[tab].seconds = chars;
    }, [tab, durations[tab === 'cycles' ? 'work' : tab].seconds])

    useEffect(() => {
        const chars = padZero(cycles).split('');
        animateDigits(chars, cyclesCharEls.current, prevCyclesChars.current);
        prevCyclesChars.current = chars;
    }, [cycles])

    return(
        <Modal
                size="lg"
                className={'p-6'}
                onClose={closeModal}
                isOpen={isSettingsModalOpen}
            >
                <h3 className="text-xl font-bold mb-6">Settings</h3>
                <div className="flex flex-col">
                    {/* Work */}
                    <div className={`grid grid-cols-4 gap-3 py-2.5 first:pt-0 last:pb-0`}>
                        
                    {
                        tabs.map((t) => {
                            return(
                        <div key={t} className={`${tab === t ? 'text-blue/70 bg-blue/5 border-blue/15' : 'border-dark/5 text-dark/70 hover:bg-dark/5 hover:border-dark/10'} flex flex-col items-center justify-center gap-1.5 p-2.5 border rounded-xl transition-all duration-150 cursor-pointer`}
                            onClick={() => setTab(t)}
                        >
                            <HugeiconsIcon icon={t === 'work' ? Briefcase01Icon : t === 'break' ? Coffee02Icon : Moon02Icon} size={24} />
                            <span className="text-sm font-medium">{tabLabels[t]}</span>
                        </div>
                    )})}
                        <div className={`${tab === 'cycles' ? 'text-blue/70 bg-blue/5 border-blue/15' : 'border-dark/5 text-dark/70 hover:bg-dark/5 hover:border-dark/10'} flex flex-col items-center justify-center gap-1.5 p-2.5 border rounded-xl transition-all duration-150 cursor-pointer`}
                            onClick={() => setTab('cycles')}
                        >
                            <HugeiconsIcon icon={RepeatIcon} size={24} />
                            <span className="text-sm font-medium">Cycles</span>
                        </div>
                    </div>

                    {
                        tabs.map((t) => {
                            return(
                                <div key={t} className={`${tab === t ? 'flex' : 'hidden'} flex-col justify-center items-center`}>
                                    <div className='flex justify-center items-center'>
                                        <div className='flex flex-col'>
                                            <Button
                                                variant='ghost'
                                                className='text-lg p-0'
                                                onClick={() => updateMinutes(t, 1)}
                                            >
                                                +
                                            </Button>
                                            <span className='text-6xl font-bold'>
                                                {padZero(durations[t].minutes).split('').map((char, i) => (
                                                    <span
                                                        key={i}
                                                        ref={el => { timerCharEls.current[t].minutes[i] = el; }}
                                                        style={{ display: 'inline-block' }}
                                                    >
                                                        {char}
                                                    </span>
                                                ))}
                                            </span>
                                            <Button
                                                variant='ghost'
                                                className='text-lg p-0'
                                                onClick={() => updateMinutes(t, -1)}
                                            >
                                                -
                                            </Button>
                                        </div>
                                        <span className='text-6xl font-bold'>
                                            :
                                        </span>
                                        <div className='flex flex-col'>
                                            <Button
                                                variant='ghost'
                                                className='text-lg p-0'
                                                onClick={() => updateSeconds(t, 1)}
                                            >
                                                +
                                            </Button>
                                            <span className='text-6xl font-bold'>
                                                {padZero(durations[t].seconds).split('').map((char, i) => (
                                                        <span
                                                            key={i}
                                                            ref={el => { timerCharEls.current[t].seconds[i] = el; }}
                                                            style={{ display: 'inline-block' }}
                                                        >
                                                            {char}
                                                        </span>
                                                ))}
                                            </span>
                                            <Button
                                                variant='ghost'
                                                className='text-lg p-0'
                                                onClick={() => updateSeconds(t, -1)}
                                            >
                                                -
                                            </Button>
                                        </div>
                                    </div>

                                    <Button
                                        variant='primary'
                                        className='mt-8'
                                        onClick={() => {setTimerDurations(prev => ({
                                                ...prev, 
                                                [t]: (durations[t].minutes * 60) + durations[t].seconds
                                            }))

                                            closeModal();
                                        }}
                                    >
                                        Set time
                                    </Button>
                                </div>

                            )
                        })
                    }


                    {
                        tab === 'cycles' && (
                            <div className='flex flex-col items-center justify-center'>
                                            <Button
                                                variant='ghost'
                                                className='text-lg py-0'
                                                onClick={() => setCycles(prev => prev+1)}
                                            >
                                                +
                                            </Button>
                                            <span className='text-6xl font-bold'>
                                                {padZero(cycles).split('').map((char, i) => (
                                                    <span
                                                        key={i}
                                                        ref={el => { cyclesCharEls.current[i] = el; }}
                                                        style={{ display: 'inline-block' }}
                                                    >
                                                        {char}
                                                    </span>
                                                ))}
                                            </span>
                                            <Button
                                                variant='ghost'
                                                className='text-lg py-0 px-6'
                                                onClick={() => setCycles(prev => prev === 0 ? 0 : prev-1)}
                                            >
                                                -
                                            </Button>

                                            <Button
                                                variant='primary'
                                                className='mt-8'
                                                onClick={() => {
                                                    setMaxTimesCount(cycles)
                                                    closeModal();
                                                }}
                                            >
                                                Set cycles
                                            </Button>
                            </div>
                        )
                    }
                    
                    
                </div>



        </Modal>
    )
}