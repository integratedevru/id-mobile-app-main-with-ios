import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import axios from 'axios'
import { API_URL, DADATA_TOKEN } from '~/static/config'

/**
 * Returns content of file if it exists (null otherwise).
 *
 * @param {*} path - path to file.
 * @param {*} options
 * base64 - if true, reads file with base64 encoding. utf-8 otherwise.
 *
 * as_plain - if true, returns raw string. json-like object otherwise.
 */
export async function read_file(path, options) {
    let enc = options?.base64 ? null : Encoding.UTF8;
  
    let data = null;
    try {
      let fileExists = await Filesystem.stat({
        path,
        directory: Directory.Data,
      })
        .then((result) => true)
        .catch((error) => false);
      if (fileExists) {
        data = (
          await Filesystem.readFile({
            path,
            directory: Directory.Data,
            encoding: enc,
          })
        )["data"];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  
    if (options?.as_plain) return data;
    else return JSON.parse(data);
  }

/**
 * Writes content to file with given path.
 *
 * @param {*} path - path to file.
 * @param {*} data - string to write to file.
 * @param {*} options
 * base64 - if true, writes file with base64 encoding. utf-8 otherwise.
 */
 export async function write_file (path, data, options) {
    let enc = options?.base64 ? null : Encoding.UTF8

    await Filesystem.writeFile({
        path: path,
        data: data,
        directory: Directory.Data,
        encoding: enc
    })
}

/**
 * Deletes file at path.
 *
 * @param {*} path - path to file.
 */
export async function delete_file (path) {
    try { await Filesystem.deleteFile({
        path: path,
        directory: Directory.Data
    }) } catch {}
}


export function createCookie (name, value, days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

export function readCookie (name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

export function eraseCookie (name) {
	createCookie(name,"",-1);
}



export function user_dummy () {
    return {
        'first': 'имя',
        'last': 'фамилия',
        'middle': 'отчество',
        'role': 'роль',
        'role_short': 'Р',
        'position': 'должность',
        'updated': 'гггг-мм-дд чч:мм:сс'
    }
}


async function logout () {
    eraseCookie('token')
    eraseCookie('user')
    await delete_file('user/token')
    await delete_file('user/allowed')
    await delete_file('user/data')
    window.location.reload()
}


/**
 * Tries to authorize user with user data from files.
 *
 * @returns token or null
 */
async function authorize_user () {
    let data = await read_file('user/data')

    if (data) {
        const response = await axios.post(
            API_URL + "/auth/email/login",
            {
                email: data.m,
                password: atob(atob(data.p)),
            }
        )
        let token = response?.data?.token
        if (token) {
            await write_file('user/token', token)
            await write_file('user/info', JSON.stringify({
                'first': data.user.firstName,
                'last': data.user.lastName,
                'middle': data.user.patronymic,
                'role': data.user.role.name,
                'role_short': data.user.role.short,
                'email': data.user.email,
                'tel': data.user.phone,

                'last_updated': now
            }))
            return token
        }
    }

    return null
}

export async function get_valid_token () {
    let token = readCookie('token')

    if (!token) token = await read_file('user/token', {as_plain: true})

    let user = await read_file('user/info')

    if (!user || (new Date() - new Date(user.last_updated)) > 300000) // if there was no update within 5 min
    try {
        const response = await fetch(
            API_URL + "/auth/me",
            {
                method: 'GET',
                headers: { Authorization: 'Bearer ' + token }
            }
        )
        if (response.status == 401) token = await authorize_user()
        else if (response.status >= 500) {
            try {
                token = await authorize_user()
                if (!token) await logout()
            }
            catch { await logout() }
        }
    }
    catch { token = null }

    return token
}

/**
 * Returns user data in case token is presented and not expired yet.
 *
 * If token expired, but email and password saved - tries to auto login with them.
 *
 * If there's access to internet, tries to update it from server.
 *
 * @param {*} is_offline - $nuxt.isOffline.
 */
 export async function get_user_info (is_offline) {
    if (!(await check_connection())) {
        return [
            readCookie('token') ? true : false,
            (await read_file('user/info')) ?? {}
        ]
    }

    let token = await get_valid_token()

    /// if token expired - try to restore ///

    if (!token && await read_file('user/allowed') && !is_offline) {
        token = authorize_user()
    }

    /// if user is authenticated ///

    if (token) {
        let user = await read_file('user/info')

        if ((new Date() - new Date(user.last_updated)) > 300000) { // if there was no update within 5 min
            if (!is_offline) { // if connected to internet
                try{
                    // try get new user data by token

                    let data = await (await fetch(
                        API_URL + "/auth/me",
                        {
                            method: 'GET',
                            headers: { Authorization: 'Bearer ' + token.toString() }
                        }
                    )).json()

                    // if token expired - delete it and exit

                    if (typeof data?.statusCode == 'string' && !data.statusCode.startsWith('2')) {
                        await delete_file('user/token')
                        return [false, null]
                    }

                    // else - save new settings

                    let now = get_now()

                    await write_file('user/info', JSON.stringify({
                        'first': data.firstName,
                        'last': data.lastName,
                        'middle': data.patronymic,
                        'role': data.role.name,
                        'role_short': data.role.short,
                        'email': data.email,
                        'tel': data.phone,

                        'last_updated': now
                    }))

                    // update var

                    user = await read_file('user/info')
                }
                catch (error) { console.log(error) } // if error - print and ignore
            }
        }

        /// apply var ///

        createCookie('token', token)
        createCookie('user', JSON.stringify(user))

        return [true, user]
    }

    return [false, {}]
}


export function scroll_check (event) {
    let block = event.target
    let up   = block.querySelector('.list-note-up')
    let down = block.querySelector('.list-note-down')

    if (up) {
        up.classList.remove('hidden')
        if (block.scrollTop < up.clientHeight + 2) {
            up.classList.add('hidden')
        }
    }

    if (down) {
        down.classList.remove('hidden')
        if (Math.abs(block.scrollHeight - block.scrollTop - block.clientHeight) < down.clientHeight + 2) {
            down.classList.add('hidden')
        }
    }
}


/**
 * Raises select dialog with options from datalist with given id.
 *
 * @param {*} datalist_id - datalist with possible options.
 * @param {*} callback  - function to call after dialog close with value passed to it.
 * @param {*} callback_options  - extra constant callback options.
 */
export function select_from (datalist_id, callback, callback_options = {}) {
    let datalist = document.getElementById(datalist_id)
    if (!datalist) return

    let dialog = document.getElementById('select-panel')
    if (!dialog) return

    let options = dialog.querySelector('#select-panel-options')
    dialog.ariaBusy = true
    options.innerHTML = ''

    let note_up = document.createElement('div')
    note_up.setAttribute('class', 'list-note-up')
    note_up.innerHTML = '⬆&nbsp;&nbsp;&nbsp;⬆&nbsp;&nbsp;&nbsp;⬆'
    options.appendChild(note_up)

    for (let data of datalist.children) {
        let value = data.value
        let text = data.innerHTML

        let option = document.createElement('button')
        option.setAttribute('type', 'button')
        option.setAttribute('value', value)
        option.setAttribute('tabindex', '0')
        option.setAttribute('aria-selected', 'false')
        option.innerHTML = text

        if (data.getAttribute('data-selected') === 'true') {
            option.setAttribute('aria-selected', 'true')
        }

        option.addEventListener('click', close_select_dialog)
        option.addEventListener('keydown', (event) => {
            if (event.code == 'Space' ||
                event.code == 'Enter') close_select_dialog(event)
        })

        options.appendChild(option)
    }

    let note_down = document.createElement('div')
    note_down.setAttribute('class', 'list-note-down')
    note_down.innerHTML = '⬇&nbsp;&nbsp;&nbsp;⬇&nbsp;&nbsp;&nbsp;⬇'
    options.appendChild(note_down)

    dialog.setAttribute('datalist', datalist_id)

    dialog.addEventListener('cancel', () => {
        let dialog = document.getElementById('select-panel')
        if (dialog) { dialog.returnValue = '__cancel__' }
    }, {once: true})

    dialog.addEventListener('close', () => {
        let dialog = document.getElementById('select-panel')
        if (dialog) {
            dialog.ariaHidden = true
            dialog.ariaModal = false
            dialog.classList.add('hidden')

            if (dialog.returnValue != '__cancel__') {
                callback(dialog.returnValue, callback_options)
            }
        }
    }, {once: true})

    dialog.ariaHidden = false
    dialog.ariaModal = true
    dialog.classList.remove('hidden')

    dialog.showModal()
    dialog.ariaBusy = false

    scroll_check({target: options})
}

/**
 * Closes select dialog and applies value within html.
 *
 * @param {*} event - dialog button click event.
 */
export function close_select_dialog (event = null) {
    let dialog = document.getElementById('select-panel')
    if (dialog) {
        let value = null
        if (event) value = event.target.value
        else value = dialog.querySelector('#select-panel-choose')

        if (value != '__cancel__') {
            let datalist = document.getElementById(dialog.getAttribute('datalist'))
            for (let option of datalist.children) option.removeAttribute('data-selected')

            let option = datalist.querySelector(`option[value="${value}"]`)
            if (option) option.setAttribute(
                'data-selected',
                'true'
            )

            let title = document.getElementById(dialog.getAttribute('datalist') + '-title')
            if (title) {
                title.innerText = option.innerText
            }
        }

        dialog.close(value)
    }
}


export function get_now () {
    let now = new Date()

    let month = now.getMonth()+1
    // if (month == 12) month = 0
    // month = month.toString().padStart(2,'0')

    let date = `${now.getFullYear()}-${month}-${now.getDate().toString().padStart(2,'0')}`
    let time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`

	return date + ' ' + time
}


const monthes = [
    'янв', 'фев',
'мар', 'апр', 'май',
'июн', 'июл', 'авг',
'сен', 'окт', 'ноя',
'дек'
]

/**
 * Returns human-readable date from raw one.
 *
 * @param {*} raw_date - string, parsable with Date class.
 */
export function process_date (raw_date) {
    let date = new Date(raw_date)
    let now = new Date()
    console.log(raw_date,date,now)

    let diff = (now - date) / 1000 // seconds
    if (diff < 60) return 'только что'
    else if (diff < 3600) { // minutes
        diff = Math.floor(diff / 60)
        if (diff > 9 && diff < 14) return diff.toString() + ' минут назад'
        else if (diff % 10 == 1) return diff.toString() + ' минуту назад'
        else if (diff % 10 < 5) return diff.toString() + ' минуты назад'
        else return diff.toString() + ' минут назад'
    }
    else if (diff < 86400) { // hours
        diff = Math.floor(diff / 3600)
        if (diff > 9 && diff < 14) return diff.toString() + ' часов назад'
        else if (diff % 10 == 1) return diff.toString() + ' час назад'
        else if (diff % 10 < 5) return diff.toString() + ' часа назад'
        else return diff.toString() + ' часов назад'
    }
    else if (diff < 2592000) { // days
        diff = Math.floor(diff / 86400)
        if (diff > 9 && diff < 14) return diff.toString() + ' дней назад'
        else if (diff % 10 == 1) return diff.toString() + ' день назад'
        else if (diff % 10 < 5) return diff.toString() + ' дня назад'
        else return diff.toString() + ' дней назад'
    }
    else if (diff < 31536000) { // monthes
        diff = Math.floor(diff / 2592000)
        if (diff > 9 && diff < 14) return diff.toString() + ' месяцев назад'
        else if (diff % 10 == 1) return diff.toString() + ' месяц назад'
        else if (diff % 10 < 5) return diff.toString() + ' месяца назад'
        else return diff.toString() + ' месяцев назад'
    }
    else { // years
        diff = Math.floor(diff / 31536000)
        if (diff > 9 && diff < 14) return diff.toString() + ' лет назад'
        else if (diff % 10 == 1) return diff.toString() + ' год назад'
        else if (diff % 10 < 5) return diff.toString() + ' года назад'
        else return diff.toString() + ' лет назад'
    }

    // let new_date = `${date.getDate()} ${monthes[date.getMonth()]} `

    // if (now.getFullYear() != date.getFullYear()) new_date += date.getFullYear() + ' '

    // new_date += `в ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

    // return new_date
}

const address_components = [
    {
        expr: /^((г|д)\.? ([а-яa-z \.\-]+), ?)?[а-яa-z0-9 \.\-]{3,}, ?д\.? \d+[а-яa-z]?((с|в|к|\/|\\)\d+)?$/i,
        message: 'Всё верно',
        correct: true
    },
    {
        expr: /^((г|д)\.? ([а-яa-z \.\-]+), ?)?[а-яa-z0-9 \.\-]{3,}, ?дом\.?/i,
        message: 'Замените "дом" на "д."'
    },
    {
        expr: /^((г|д)\.? ([а-яa-z \.\-]+), ?)?[а-яa-z0-9 \.\-]{3,}, ?д\.? \d+[а-яa-z]?((с|в|к|\/|\\)\d+)?.*/i,
        message: 'Лишние символы в конце'
    },

    {
        expr: /^(г|д)\.? ([а-яa-z \.\-]+), ?[а-яa-z0-9 \.\-]{3,}, ?/i,
        message: 'Добавьте "д." и номер дома через пробел'
    },
    {
        expr: /^(г|д)\.? ([а-яa-z \.\-]+), ?[а-яa-z0-9 \.\-]{1,2}, ?/i,
        message: 'Слишком короткое название улицы - минимум 3 символа'
    },
    {
        expr: /^(г|д)\.? ([а-яa-z \.\-]+), ?[а-яa-z0-9 \.\-]+/i,
        message: 'Закончите название и добавьте запятую'
    },
    {
        expr: /^(г|д)\.? ([а-яa-z \.\-]+), ?/i,
        message: 'Добавьте название улицы'
    },
    {
        expr: /^(г|д)\.? [а-яa-z \.\-]*\d+[а-яa-z \.\-]*/i,
        message: 'Населённый пункт не может содержать цирфы'
    },
    {
        expr: /^(г|д)\.? ([а-яa-z \.\-]+)/i,
        message: 'Закончите название населённого пункта и добавьте запятую'
    },
    {
        expr: /^(г|д)\.? /i,
        message: 'Добавьте название населённого пункта'
    },

    {
        expr: /^[а-яa-z0-9 \.\-]{3,}, ?/i,
        message: 'Добавьте "д." и номер дома через пробел'
    },
    {
        expr: /^[а-яa-z0-9 \.\-]{1,2}, ?/i,
        message: 'Слишком короткое название улицы - минимум 3 символа'
    },
    {
        expr: /^[а-яa-z0-9 \.\-]+/i,
        message: 'Закончите название и добавьте запятую'
    },
    {
        expr: /^/i,
        message: 'Укажите название улицы'
    },
]

/**
 * Returns string with status.
 *
 * @param {*} address - string, address to check.
 */
export function check_address (address) {
    for (let re of address_components) {
        if (address.match(re['expr'])) {
            if (!re.correct) re.correct = false
            return re
        }
    }
}


const lat_num = /^(-?|N|S)(90|[1-8]?\d)(,|\.)(\d{4,})°?$/
const lon_num = /^(-?|W|E)(180|\d{1,2}|1[0-7]\d)(,|\.)(\d{4,})°?$/

const lat_grad = /^(90|[1-8]?\d)°([1-5]?\d)['`′]([1-5]?\d(?:[\.,]\d+)?)(?:''|"|``|′′|″)(N|S)$/
const lon_grad = /^(180|\d{1,2}|1[0-7]\d)°([1-5]?\d)['`′]([1-5]?\d(?:[\.,]\d+)?)(?:''|"|``|′′|″)(W|E)$/

export function parse_coordinate (axis, value) {
    if (axis.startsWith('lat')) {
        let matched = value.match(lat_num)
        if (matched) {
            let n = 0

            if (matched[1] == '-' || matched[1] == 'S') {
                n = Number('-' + matched[2] + '.' + matched[4])
            }
            else {
                n = Number(matched[2] + '.' + matched[4])
            }

            if (n > 90) return 90
            else if (n < -90) return -90
            else return n
        }

        matched = value.match(lat_grad)
        if (matched) {
            let n = 0
            let min = Number(matched[2])
            let sec = Number(matched[3])

            if (matched[4] == 'S') {
                n = -(Number(matched[1]) + (min*60 + sec) / 3600)
            }
            else {
                n = Number(matched[1]) + (min*60 + sec) / 3600
            }

            console.log(matched)
            console.log(n)

            if (n > 90) return 90
            else if (n < -90) return -90
            else return n
        }

        return null
    }

    if (axis.startsWith('lon')) {
        let matched = value.match(lon_num)
        if (matched) {
            let n = 0

            if (matched[1] == '-' || matched[1] == 'W') {
                n = Number('-' + matched[2] + '.' + matched[4])
            }
            else {
                n = Number(matched[2] + '.' + matched[4])
            }

            if (n > 180) return 180
            else if (n < -180) return -180
            else return n
        }

        matched = value.match(lon_grad)
        if (matched) {
            let n = 0
            let min = Number(matched[2])
            let sec = Number(matched[3])

            if (matched[4] == 'W') {
                n = -(Number(matched[1]) + (min*60 + sec) / 3600)
            }
            else {
                n = Number(matched[1]) + (min*60 + sec) / 3600
            }

            if (n > 180) return 180
            else if (n < -180) return -180
            else return n
        }

        return null
    }

    return null
}

function timeout (ms, promise) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { reject(new Error('TIMEOUT')) }, ms)

        promise
        .then(value => {
            clearTimeout(timer)
            resolve(value)
        })
        .catch(reason => {
            clearTimeout(timer)
            reject(reason)
        })
    })
}

export async function check_connection () {
    try {
        await timeout(
            1000,
            fetch(
                API_URL,
                { method: 'HEAD' }
            )
        );
        return true
    } catch (err) { return false }
}


export async function suggest_address (address, input, preferred) {
    if (address.trim() == '') return

    let city = ''

    if (preferred) {
        city = (
            preferred.region +
            ', ' +
            preferred.city +
            ', '
        )
    }

    let matched = address.match(/^(г|д)\.? [а-яa-z \-]+, ?/i)
    if (matched) {
        city = matched[0]
        address.replace(matched[0], '')
    }

    let res = await (await fetch(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(
            {
                query: city + address,
                count: 5,
                language: 'ru'
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Token ' + DADATA_TOKEN,
            }
        }
    )).json()

    let aside = document.getElementById('address-variants')
    aside.classList.remove('hidden')
    aside.setAttribute('aria-hidden', 'false')
    aside.setAttribute('aria-expanded', 'true')
    aside.innerHTML = ''

    for (let result of res['suggestions']) {
        let div = document.createElement('div')

        div.innerText = result.value.replace(preferred?.region ?? '', '')
        div.addEventListener('click', async () => {
            input.value = div.innerText
            input.focus()
        })

        aside.appendChild(div)
    }
}


export async function suggest_city (city, input) {
    if (city.trim() == '') return

    let res = await (await fetch(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(
            {
                query: city,
                count: 5,
                language: 'ru'
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Token ' + DADATA_TOKEN,
            }
        }
    )).json()

    let aside = document.getElementById('address-variants')
    aside.classList.remove('hidden')
    aside.setAttribute('aria-hidden', 'false')
    aside.setAttribute('aria-expanded', 'true')
    aside.innerHTML = ''

    let cities = {}

    for (let result of res['suggestions']) {
        cities[result.data.city] = result
    }

    delete cities['null']

    for (let city_name in cities) {
        let div = document.createElement('div')

        div.innerText = city_name
        div.addEventListener('click', async () => {
            input.value = city_name
            input.focus()
        })

        aside.appendChild(div)
    }
}


/**
 * Returns address by coords.
 *
 * @param {*} lat - number, lattitude
 * @param {*} lon - number, longitude
 *
 * @returns - string or null, nearest suitable address if exists
 */
export async function resolve_geolocation (lat, lon) {
    let response = await(await fetch(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address',
        {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(
            {
                lat: lat,
                lon: lon,
                count: 1,
                language: 'ru'
            }),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Token ' + DADATA_TOKEN,
            }
        }
    )).json()

    try {
        return {
            address: response.suggestions[0].value,
            city: response.suggestions[0].data.city_with_type,
            region: response.suggestions[0].data.region_with_type
        }
    }
    catch { return null }
}
