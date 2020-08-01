import './style'
import { Component, render, h, Fragment, createContext  } from 'preact'
import {useState, useEffect, useContext} from 'preact/hooks'
import { produce } from 'immer'

let context = createContext()

// to get rid of /build/index.html, we go one back to /eng
// from there, to get data, we go ./data/...
window.history.replaceState(null, '', '..')

// debug
window._clearLC = () => {
	for (let i in window.localStorage) {
		if (i.includes('EA_')) {
			delete window.localStorage[i]
		}
	}
}

render(<App />, document.body)


/////////////////////
function parse(s) {
	let res = []

	s.split('\n').filter(o => o).forEach(i => {
		if (i[0] == '/' && i[1] == '/') {
			res.push([])
		} else {
			res[res.length-1].push(i)
		}
	})

	if (!res.length) return [[]]
	else return res
}


//////////////////////
function App () {

	let [s,ss] = useState({
		version: '1.01',
		lang: 'rus',
		langUpdateNeeded: false,
		allLangs: ['rus', 'tur'],
		engData: [[]],
		data: [[]],
		page: +window.localStorage.EA_page || 0,
		darkMode: !!window.localStorage.EA_darkMode,
		error: ''
	})

	useEffect(() => {
		if (!s.langUpdateNeeded) return

		window.localStorage.EA_lang = s.lang
		fetch(`data/translations/${s.lang}`).then(r => r.text()).then(res => {
			window.localStorage.EA_data = res

			ss( produce(s => {
				s.langUpdateNeeded = false
				s.data = parse(res)
			}))
		})
		.catch(er => {
			ss( produce(s => {
				s.langUpdateNeeded = false
				s.error = 'No Internet'
			}))
		})

	}, [s.langUpdateNeeded])

	useEffect(() => {
		if ( s.version != +window.localStorage.EA_version || !window.localStorage.EA_engData) {
			window.localStorage.EA_version = s.version
			fetch('data/eng').then(r => r.text()).then(res => {
				window.localStorage.EA_engData = res
	
				let newLang
				if (window.localStorage.EA_lang) {
					newLang = window.localStorage.EA_lang
				} else {
					newLang = s.lang
					window.localStorage.EA_lang = newLang
				}

				let dataExists = !!window.localStorage.EA_data

				ss( produce(s => {
					s.engData = parse(res)
					if (!dataExists) s.langUpdateNeeded = true
					s.lang = newLang
				}))
			})
			.catch(er => {
				ss( produce(s => {
					s.error = 'No Internet. Restart the app.'
				}))
			})
		}
		else {
			ss( produce(s => {
				s.engData = parse(localStorage.EA_engData)
				s.data = parse(localStorage.EA_data)
				s.lang = localStorage.EA_lang
			}))
		}

	}, [])
	
	// debug
	window._s = s


	return <context.Provider value={[s,ss]}>
		<div class={`App ${s.darkMode ? 'dark' : 'light'}`}>
			{
				s.error ? <Error /> : null
			}
			<Menu />
			{
				s.engData[s.page]?.map((en, en_n) => {
					return <Entry original={en} trans={s.data[s.page]?.[en_n]} />
				})
			}
			{
				s.engData[s.page]?.length > 5 ? <Menu /> : null
			}
			
		</div>
	</context.Provider>
}




////////////////////////
function Menu() {
	let [g,gg] = useContext(context)

	function pageChanged(e) {
		window.localStorage.EA_page = e.target.value
		gg( produce(s => {
			s.page = +e.target.value
		}))
	}

	function darkChanged(e) {
		window.localStorage.EA_darkMode = e.target.value == 'light' ? '' : 'true'
		gg(produce(s => {
			s.darkMode = e.target.value == 'dark'
		}))
	}

	function langChanged(e) {
		gg(produce(s => {
			s.lang = e.target.value
			s.langUpdateNeeded = true
		}))
	}

	return <div class='Menu'>
		<select onChange={pageChanged}>
			{
				Array(g.engData.length).fill(true).map((e,i) => {
					return <option
					value={i.toString()}
					selected={g.page == i ? 'selected' : null}
					>
						{i}
					</option>
				})
			}
		</select>

		<select onChange={darkChanged}>
			<option
				value='dark'
				selected={g.darkMode ? 'selected' : null}
			>
				Dark
			</option>
			<option
				value='light'
				selected={g.darkMode ? null : 'selected'}
			>
				Light
			</option>
		</select>

		<select onChange={langChanged}>
			{
				g.allLangs.map(e => {
					return <option value={e} selected={e == g.lang}>
						{e}
					</option>
				})
			}
		</select>
	</div>
}





/////////////////////////
function Entry({original, trans}) {

	let [fast, setFast] = useState(false) // fast?
	let [g,gg] = useContext(context)

	function speak() {
		let synth = window.speechSynthesis
		let voices = synth.getVoices()

		if (!voices.length) {
			gg( produce(s => {
				s.error = 'Speech not supported.'
			}))
			return
		}

		let selectedVoiceId = 0
		voices.forEach((v,i) => {
			if (v.lang == 'en' || v.lang == 'en-US' || v.lang == 'en-GB') {
				selectedVoiceId = i
			}
		})
		let sentence = new SpeechSynthesisUtterance(original)
		sentence.voice = voices[selectedVoiceId]
		sentence.pitch = 1
		sentence.rate = fast ? 1 : 0.5
		synth.speak(sentence)
		setFast( !fast )
	}

	return <div class='Entry'>
		<p onClick={speak}>{original}</p>
		<p>{trans}</p>
	</div>
}





//////////////////////////
function Error() {
	let [g,gg] = useContext(context)

	setTimeout(() => {
		gg( produce(s => {
			s.error = ''
		}))
	}, 3000)

	return <div className="Error">
		{g.error}
	</div>
}