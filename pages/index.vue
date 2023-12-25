<template>
	<div id="container">
		<main role="main" id="main" class="index">
			<div id="block-account">
				<NuxtLink v-if="is_authenticated" to='/account' class="link-button user-block">
					<div class="user-logo" aria-hidden="true">
						<p class="user-pseudo-logo" translate="no">{{ user.role_short }}</p>
					</div>
					<div class="user-info">
						<label class="user-first">{{ user.first }}</label>
						<label class="user-role">{{ user.role }}</label>
					</div>
				</NuxtLink>

				<template v-else>
					<div id="warning-block">
						<p>
							Без авторизации Вы можете заполнять чек листы.
							Однако чтобы отправить их необходимо войти в систему
							под Вашей учетной записью.
						</p>
					</div>
					<div id='auth-block'>
						<NuxtLink to="/account" class="link-button">
							<button type="button" class="click-button">войти</button>
						</NuxtLink>
					</div>
				</template>
			</div>

			<div id="block-check">
				<button type="button" id="manual-check" class="click-button" @click="manual_check()">проверить соединение</button>
			</div>

			<div id="block-view">
				<NuxtLink v-if="draft" to="/view/draft" class="view-draft" aria-label="Перейти к списку черновиков">
					<h1>ВСЕ ЧЕРНОВИКИ</h1>
					<p aria-label="Количество черновиков">сейчас {{ draft }}</p>
				</NuxtLink>
				<a v-else class="view-deactivated" aria-disabled="true">
					<h1>ВСЕ ЧЕРНОВИКИ</h1>
					<p>сейчас {{ filled }}</p>
				</a>

				<hr />

				<NuxtLink v-if="filled" to="/view/filled" class="view-filled" aria-label="Перейти к списку заполненных">
					<h1>ВСЕ ЗАПОЛНЕННЫЕ</h1>
					<p aria-label="Количество заполненных чек-листов">сейчас {{ filled }}</p>
				</NuxtLink>
				<a v-else class="view-deactivated" aria-disabled="true">
					<h1>ВСЕ ЗАПОЛНЕННЫЕ</h1>
					<p>сейчас {{ filled }}</p>
				</a>

				<hr />

				<NuxtLink v-if="sended" to="/view/sended" class="view-sended" aria-label="Перейти к списку отправленных">
					<h1>ВСЕ ОТПРАВЛЕННЫЕ</h1>
					<p aria-label="Количество отправленных чек-листов">сейчас {{ sended }}</p>
					<p aria-label="Количество отправленных чек-листов за всё время" v-if="all_time_sended">на сервере {{ all_time_sended }}</p>
				</NuxtLink>
				<a v-else class="view-deactivated" aria-disabled="true">
					<h1>ВСЕ ОТПРАВЛЕННЫЕ</h1>
					<p>сейчас {{ sended }}</p>
					<p v-if="all_time_sended">на сервере {{ all_time_sended }}</p>
				</a>
			</div>

			<div id="block-create">
				<NuxtLink to="/new" class="link-button" tabindex="-1">
					<button type="button" class="click-button">создать новый чек-лист</button>
				</NuxtLink>
			</div>

			<div id="block-feedback" v-if="is_authenticated && feedback.may_send">
				<button type="button" class="click-button" @click="write_feedback()">отзыв о работе приложения</button>
			</div>
		</main>

		<!-- <aside id="update-notification" :class="update ? null : 'shifted'" @click="dowload_update()" aria-label="Скачать новое обновление">
			<div>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="48" height="48" fill="#FFFFFF"><path d="M480-313 287-506l43-43 120 120v-371h60v371l120-120 43 43-193 193ZM220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Z"/></svg>
				<p>скачать<br />обновление</p>
			</div>
			<div>{{ update }} Мб</div>
		</aside> -->

		<dialog id="feedback-dialog" class="hidden" tabindex="-1" role="dialog" aria-hidden="true" aria-modal="false" aria-live="polite" aria-atomic="true" aria-busy="false" aria-labelledby="feedback-header">
			<div role="main" aria-label="Основные поля">
				<h1 id="feedback-header" class="hidden">Отзыв о работе приложения</h1>
				<iframe class="hidden" id="dummyframe"></iframe>
				<form id="feedback-body" target="dummyframe">
					<label>Понравилось ли Вам работать с приложением?</label>
					<svg v-for="i in   feedback.mark" @click="set_feedback('mark', i              )" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="48" height="48" fill="var(--colour-header-back)" role="button" :aria-label="'оценка '+i"                ><path d="M480-229 294-117q-8 5-17 4.5t-16-5.5q-7-5-10.5-13t-1.5-18l49-212-164-143q-8-7-9.5-15.5t.5-16.5q2-8 9-13.5t17-6.5l217-19 84-200q4-9 12-13.5t16-4.5q8 0 16 4.5t12 13.5l84 200 217 19q10 1 17 6.5t9 13.5q2 8 .5 16.5T826-504L662-361l49 212q2 10-1.5 18T699-118q-7 5-16 5.5t-17-4.5L480-229Z"/></svg>
					<svg v-for="i in 5-feedback.mark" @click="set_feedback('mark', feedback.mark+i)" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="48" height="48" fill="var(--colour-header-back)" role="button" :aria-label="'оценка '+(feedback.mark+i)"><path d="m323-205 157-94 157 95-42-178 138-120-182-16-71-168-71 167-182 16 138 120-42 178Zm157-24L294-117q-8 5-17 4.5t-16-5.5q-7-5-10.5-13t-1.5-18l49-212-164-143q-8-7-9.5-15.5t.5-16.5q2-8 9-13.5t17-6.5l217-19 84-200q4-9 12-13.5t16-4.5q8 0 16 4.5t12 13.5l84 200 217 19q10 1 17 6.5t9 13.5q2 8 .5 16.5T826-504L662-361l49 212q2 10-1.5 18T699-118q-7 5-16 5.5t-17-4.5L480-229Zm0-206Z"/></svg>


					<label id="feedback-to_do">Что бы Вы посоветовали нам исправить или добавить?</label>
					<textarea name="to_do" placeholder="опционально" :value="feedback.to_do" @change="set_feedback('to_do', $event)" aria-describedby="feedback-to_do"></textarea>

					<label>Насколько Вам понравился дизайн?</label>
					<svg v-for="i in   feedback.design" @click="set_feedback('design', i                )" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="48" height="48" fill="var(--colour-header-back)" role="button" :aria-label="'оценка '+i"                  ><path d="M480-229 294-117q-8 5-17 4.5t-16-5.5q-7-5-10.5-13t-1.5-18l49-212-164-143q-8-7-9.5-15.5t.5-16.5q2-8 9-13.5t17-6.5l217-19 84-200q4-9 12-13.5t16-4.5q8 0 16 4.5t12 13.5l84 200 217 19q10 1 17 6.5t9 13.5q2 8 .5 16.5T826-504L662-361l49 212q2 10-1.5 18T699-118q-7 5-16 5.5t-17-4.5L480-229Z"/></svg>
					<svg v-for="i in 5-feedback.design" @click="set_feedback('design', feedback.design+i)" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="48" height="48" fill="var(--colour-header-back)" role="button" :aria-label="'оценка '+(feedback.design+i)"><path d="m323-205 157-94 157 95-42-178 138-120-182-16-71-168-71 167-182 16 138 120-42 178Zm157-24L294-117q-8 5-17 4.5t-16-5.5q-7-5-10.5-13t-1.5-18l49-212-164-143q-8-7-9.5-15.5t.5-16.5q2-8 9-13.5t17-6.5l217-19 84-200q4-9 12-13.5t16-4.5q8 0 16 4.5t12 13.5l84 200 217 19q10 1 17 6.5t9 13.5q2 8 .5 16.5T826-504L662-361l49 212q2 10-1.5 18T699-118q-7 5-16 5.5t-17-4.5L480-229Zm0-206Z"/></svg>

					<p>Спасибо за уделённое время. Мы учтём все пожелания.</p>
				</form>
			</div>

			<form method="dialog" class="nav-menu" role="menu" aria-label="Меню формы">
				<button type="button" class="click-button" value="__cancel__" @click="close_feedback()">отмена</button>
				<button type="button" class="click-button" value="__submit__" @click="send_feedback()">отправить</button>
			</form>
		</dialog>
	</div>
</template>

<script>
	import { Filesystem, Directory } from '@capacitor/filesystem'
	import { FileOpener } from '@capacitor-community/file-opener'
	import {
		write_file,
		read_file,
		get_now,
		readCookie,
		user_dummy,
		get_user_info,
		check_connection
	} from '~/static/common'
	import {
		API_URL
	} from '~/static/config'

	export default {
		name: 'IndexPage',

		data: function () {
			let draft = 0
			let filled = 0
			let sended = 0
			let all_time_sended = '...'

			for (let i = 0; i < localStorage.length; i++) {
				let val = localStorage.getItem(localStorage.key(i))
				if      (val.startsWith('draft' )) draft++
				else if (val.startsWith('filled')) filled++
				else if (val.startsWith('sended')) sended++
			}

			let is_authenticated = false
			let user = user_dummy()
			let token = readCookie('token')
			if (token) {
				is_authenticated = true
				user = JSON.parse(readCookie('user'))
			}

			return {
				is_authenticated: is_authenticated,
				user: user,
				user_token: token,

				draft: draft,
				filled: filled,
				sended: sended,
				all_time_sended: all_time_sended,

				svg_size: 58,
				min_svg_size: 32,

				feedback: {
					may_send: true,
					mark: 0,
					design: 0,
					to_do: ''
				},

				update: null
			}
		},

		beforeMount: async function () {
			try { await Filesystem.mkdir({overwrite: true,
					path: 'user',
					directory: Directory.Data
				})
			} catch {}

			let [is_authenticated, user] = await get_user_info()
			this.is_authenticated = is_authenticated
			this.user = user
			this.user_token = readCookie('token')

			let v = await read_file('user/feedback', {as_plain: true})
			if (v && (new Date() - new Date(v)) < 604800000) { // 1 week
				this.feedback.may_send = false
			}

			if (this.is_authenticated) {
				const response = await fetch(
					API_URL + "/mobile-app-objects/statistics",
					{
						method: 'GET',
						headers: {
							Authorization: "Bearer " + this.user_token,
							Connection: "close"
						}
					}
				)
				if (response) {
					this.all_time_sended = (await response.json()).count
				}
				else {
					this.all_time_sended = ''
				}
			}

			/// check for updates ///

			// try {
			// 	let response = await fetch(
			// 		API_URL + "/files/checklists.apk",
			// 		{
			// 			method: 'HEAD',
			// 			headers: { Connection: "close" }
			// 		}
			// 	)

			// 	if (response) {
			// 		let modified = new Date(response.headers.get('last-modified'))
			// 		let size = response.headers.get('content-length')

			// 		let date = new Date(await read_file('user/last-update', {as_plain: true}))

			// 		if (date.getTime() != modified.getTime()) {
			// 			this.update = Math.round(size / 1024 / 1024 * 100) / 100
			// 		}
			// 	}
			// } catch {}
		},

		methods: {
			dowload_update: async function () {
				return

				if (!check_connection()) return alert('Отсутствует подключение к интернету. Попробуйте позже.')

				let response = await fetch(
					API_URL + "/files/checklists.apk",
					{
						method: 'GET',
						headers: { Connection: "close" }
					}
				)

				if (response) {
					let blob = await response.blob()
					let data = null

					await new Promise(resolve => {
						let reader = new FileReader()
						reader.onload = () => {
							data = reader.result.replace(/data:[^;]+;base64,/i, '')
							resolve()
						}
						reader.readAsDataURL(blob)
					})

					await Filesystem.writeFile({
						path: 'user/update.apk',
						data: data,
						directory: Directory.Data
					})

					let uri = await Filesystem.getUri({
						path: 'user/update.apk',
						directory: Directory.Data
					})

					// file:///data/user/0/ru.uralsteel.apps.checklists/files/user/apk

					try{
						alert(uri.uri)
						await FileOpener.open({
							filePath: uri.uri,
							contentType: 'application/vnd.android.package-archive'
						})
						alert('конец')
					}
					catch (error) {
						alert(error)
					}

					// await write_file(
					// 	'user/last-update',
					// 	(new Date(response.headers.get('last-modified'))).getTime(),
					// 	{as_plain: true}
					// )
				}
				else return alert('Ошибка скачивания файла. Попробуйте позже.')
			},

			write_feedback: function () {
				let dialog = document.getElementById('feedback-dialog')
				if (!dialog) return

				dialog.ariaBusy = true
				dialog.ariaHidden = false
				dialog.ariaModal = true
				dialog.classList.remove('hidden')

				dialog.showModal()
				dialog.ariaBusy = false
			},

			set_feedback: function (param, value) {
				if (value.target) value = value.target.value
				this.feedback[param] = value
			},

			send_feedback: async function () {
				let dialog = document.getElementById('feedback-dialog')
				if (dialog) {
					let text = ''

					text += `Общая оценка: ${this.feedback.mark ?? '-'}\n=====\n`
					text += `Оценка дизайна: ${this.feedback.design ?? '-'}\n=====\n`
					text += `Предложения: ${this.feedback.to_do ?? '-'}`

					await fetch(
						API_URL + '/feedback',
						{
							method: 'POST',
							body: JSON.stringify({
								text: text,
								route: 'mobile-app'
							}),
							headers: {
								Authorization: 'Bearer ' + this.user_token,
								'Content-Type': 'application/json',
								Connection: 'close'
							}
						}
					)

					await write_file('user/feedback', get_now(), {as_plain: true})
					this.feedback.may_send = false

					alert('Спасибо за отзыв!')
					this.close_feedback()
				}
			},

			close_feedback: function () {
				let dialog = document.getElementById('feedback-dialog')
				if (dialog) {
					document.getElementById('feedback-body').reset()
					dialog.ariaHidden = true
					dialog.ariaModal = false
					dialog.classList.add('hidden')
					dialog.close()
				}
			},

			manual_check: async function () {
				let button = document.getElementById('manual-check')

				if (button) {
					button.innerText = 'подождите...'
					await new Promise(r => setTimeout(r, (Math.random() + .3) * 1000))
					if (await check_connection()) button.innerText = 'успешно'
					else button.innerText = 'нет подключения'
				}
			}
		}
	}
</script>

<style>
	#container {
		width: 100%;
	}

	#main.index {
		width: 90%;
		max-width: 500px;
		margin: 20px auto;
	}

	#main.index > * {
		width: 100%;
		margin-bottom: 50px;
		background-color: transparent;
		border: none;
	}


	#warning-block > p {
		box-sizing: border-box;
		padding: 10px;
		margin-bottom: 20px;
		border: 3px solid var(--colour-btn-back);
		border-radius: 20px;
		font-size: 75%;
		text-align: center;
	}


	#auth-block {
		text-align: center;
		vertical-align: middle;
	}
	#auth-block > * {
		display: inline-block;
		padding: 4px;
		vertical-align: middle;
	}
	#auth-block > a {
		width: calc(100% - 70px);
	}
	#auth-block > a > button {
		width: 100%;
	}

	#main > #block-check {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 80%;
		margin: 20px auto;
	}
	#main > #block-check > button {
		height: fit-content;
		min-height: 44px;
	}

	#main > #block-view {
		width: 90%;
		margin: auto;
		border: 3px solid var(--colour-view);
		border-radius: 20px;
    	box-shadow: 0 4px 5px 1px var(--colour-front);
	}

	.view-deactivated {
		opacity: .5;
	}


	#update-notification {
		position: fixed;
		bottom: 0;
		left: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		margin-top: 30px;
		border-radius: 20px 20px 0 0;
		background: linear-gradient(to right bottom, #dab200, #e49a69);
		color: #FFFFFF;
		text-align: center;
		transition: .5s;
	}
	#update-notification:active {
		filter: brightness(1.1);
	}
	#update-notification:not(.shifted) {
		left: 0;
	}

	#update-notification > div {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: flex-start;
		gap: 4px;
		text-align: left;
	}


	#block-feedback {
		text-align: center;
	}

	#block-feedback > button {
		height: auto;
		border: 3px solid #AA2200;
		border-radius: 20px;
		padding: 20px 10px;
		background-color: transparent;
		color: #AA2200;
	}

	#feedback-dialog {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 20px;
		box-sizing: border-box;
		width: 90vw;
		max-width: 600px;
		max-height: 90vh;
		margin: auto;
		background-color: transparent;
		overflow: hidden;
	}

	#feedback-dialog::backdrop {
		background-color: #000000;
		opacity: .6;
	}

	#feedback-dialog > div {
		display: flex;
		flex-grow: 1;
		flex-direction: column;
		flex-wrap: nowrap;
		box-sizing: border-box;
		width: 100%;
		height: fit-content;
		padding: 0;
		padding-top: 20px;
		border: 1px solid var(--colour-front);
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
		background-color: var(--colour-back);
		text-align: center;
	}

	#feedback-dialog #feedback-header {
		display: block;
		padding: 10px 0;
		margin-bottom: 10px;
		background-color: var(--colour-header-back);
		color: var(--colour-header-front);
		font-size: 120%;
		text-align: center;
	}

	#feedback-dialog #feedback-body {
		height: fit-content;
		max-height: 60vh;
		border-radius: 0 0 20px 20px;
		overflow: auto;
	}

	#feedback-dialog #feedback-body label {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 6px 20px;
		margin-bottom: 10px;
		background-color: var(--colour-preback);
		font-size: 80%;
	}

	#feedback-dialog #feedback-body select {
		box-sizing: border-box;
		width: 80%;
		padding: 6px 20px;
		margin-bottom: 10px;
		font-size: 80%;
	}

	#feedback-dialog #feedback-body textarea {
		box-sizing: border-box;
		width: 80%;
		height: 100px;
		min-height: 100px;
		padding: 6px 20px;
		border: 1px solid var(--colour-semifront);
		font-size: 80%;
		resize: none;
	}

	#feedback-dialog #feedback-body p {
		padding: 4px 20px;
		margin-top: 30px;
		border-radius: 0 0 20px 20px;
		background-color: var(--colour-preback);
		font-size: 70%;
		text-align: left;
	}

	#feedback-dialog > form {
		margin-top: 0;
		text-align: center;
	}
	#feedback-dialog > form > button {
		margin-bottom: 4px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}
</style>
