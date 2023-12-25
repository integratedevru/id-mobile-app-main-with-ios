<template>
	<div id="container">
		<template v-if="is_authenticated">
			<main id="main" role="main" class="profile">
				<div class="user-block">
					<div class="user-logo">
						<p class="user-pseudo-logo" translate="no">{{ user.role_short }}</p>
					</div>
					<div class="user-info">
						<label class="user-first">{{ user.first }}</label>
						<label class="user-role">{{ user.role }}</label>
					</div>
				</div>

				<address id="full-user-info" role="contentinfo">
					<h2>
						Синхронизировано
						<time :datetime="user.last_updated">{{ process_date(user.last_updated) }}</time>
					</h2>
					<p class="user-name">{{ user.last }} {{ user.first }} {{ user.middle }}</p>
					<p class="user-email" v-if="user.email">{{ user.email }}</p>
					<p class="user-tel" v-if="user.tel">{{ user.tel }}</p>
				</address>

				<div id="settings">
					<h1>Настройки пользователя</h1>
					<div>
						<section class="set-section">
							<h2>1. Редактировать фото после съёмки</h2>
							<menu role="radiogroup" aria-orientation="horizontal">
								<li>
									<input type="radio" name="set-edit_photo" id="set-edit_photo-1" :checked="settings.edit_photo ? 'checked' : null" @click="set_option('edit_photo', true)" />
									<label for="set-edit_photo-1">да</label>
								</li>
								<li>
									<input type="radio" name="set-edit_photo" id="set-edit_photo-0" :checked="!settings.edit_photo ? 'checked' : null" @click="set_option('edit_photo', false)" />
									<label for="set-edit_photo-0">нет</label>
								</li>
							</menu>
							<button type="button" @click="help_with('edit_photo')" aria-controls="help_dialog">Что это?</button>
						</section>

						<section class="set-section">
							<h2>2. Сохранять копии фото на телефон</h2>
							<menu role="radiogroup" aria-orientation="horizontal">
								<li>
									<input type="radio" name="set-save_copies" id="set-save_copies-1" :checked="settings.save_copies ? 'checked' : null" @click="set_option('save_copies', true)" />
									<label for="set-save_copies-1">да</label>
								</li>
								<li>
									<input type="radio" name="set-save_copies" id="set-save_copies-0" :checked="!settings.save_copies ? 'checked' : null" @click="set_option('save_copies', false)" />
									<label for="set-save_copies-0">нет</label>
								</li>
							</menu>
							<button type="button" @click="help_with('save_copies')" aria-controls="help_dialog">Что это?</button>
						</section>

						<section class="set-section">
							<h2>3. Способ загрузки фотографий</h2>
							<menu role="radiogroup" aria-orientation="vertical">
								<li>
									<input type="radio" name="set-picture_source" id="set-picture_source-0" :checked="settings.picture_source == 'photo' ? 'checked' : null" @click="set_option('picture_source', 'photo')" />
									<label for="set-picture_source-0">С камеры</label>
								</li>
								<li>
									<input type="radio" name="set-picture_source" id="set-picture_source-1" :checked="settings.picture_source == 'storage' ? 'checked' : null" @click="set_option('picture_source', 'storage')" />
									<label for="set-picture_source-1">Из хранилища</label>
								</li>
								<li>
									<input type="radio" name="set-picture_source" id="set-picture_source-2" :checked="settings.picture_source == 'ask' ? 'checked' : null" @click="set_option('picture_source', 'ask')" />
									<label for="set-picture_source-2">Каждый раз спрашивать</label>
								</li>
							</menu>
							<button type="button" @click="help_with('picture_source')" aria-controls="help_dialog">Что это?</button>
						</section>
					</div>
				</div>

				<div class="nav-menu" role="menu">
					<button type="button" class="click-button" @click="go_back()">меню</button>
					<button type="button" class="click-button" @click="logout()">выйти из аккаунта</button>
				</div>
			</main>

			<dialog id="help-dialog" class="hidden" tabindex="-1" role="dialog" aria-hidden="true" aria-modal="false" aria-live="polite" aria-atomic="true" aria-busy="false" aria-labelledby="help-header">
				<section>
					<h1 id="help-header">Справка</h1>
					<div id="help-content">

					</div>
				</section>

				<form method="dialog">
					<button type="button" class="click-button" @click="close_help_dialog()">понятно</button>
				</form>
			</dialog>
		</template>

		<template v-else>
			<main id="main" role="main" class="login">
				<figure id="logo-block" aria-hidden="true">
					<img alt='' :src='LOGOTYPE' aria-hidden="true"/>
				</figure>

				<form id="login-block" @submit.prevent="send_data($event)">
					<div>
						<input type="email" placeholder="эл. почта" name="email" :value="cached_email" autocomplete="username" required aria-required="true" />
					</div>
					<div>
						<input type="password" placeholder="пароль" name="password" autocomplete="current-password" required aria-required="true" />
					</div>
					<div id="login-block-checkbox">
						<input type="checkbox" id="remember_data" name="allow" title='Если "да", приложение запомнит данные для входа и будет их подставлять вместо вас.'>
						<label for="remember_data">Запомнить данные для входа</label>
					</div>
					<div class="nav-menu" role="menu">
						<button type="button" class="click-button" @click="go_back()">меню</button>
						<button type="submit" class="click-button" role="menuitem">войти</button>
					</div>
				</form>
			</main>
		</template>

		<dialog id="select-panel" class="hidden" tabindex="-1" role="dialog" aria-hidden="true" aria-modal="false" aria-live="polite" aria-atomic="true" aria-busy="false" aria-labelledby="select-panel-header">
			<div>
				<h1 id="select-panel-header">Выберите вариант</h1>
				<form method="dialog" id="select-panel-options" role="radiogroup"></form>
			</div>

			<form method="dialog">
				<button type="button" class="click-button" value="__cancel__" @click="close_select_dialog($event)">отмена</button>
			</form>
		</dialog>
	</div>
</template>

<script>
	import {
		write_file,
		read_file,
		delete_file,
		readCookie,
		createCookie,
		user_dummy,
		get_user_info,
		select_from,
		close_select_dialog,
		process_date,
		get_now,
		eraseCookie
	} from '~/static/common'
	import { API_URL, LOGOTYPE } from '~/static/config'

	export default {
		name: 'IndexPage',

		data: function () {
			let settings = { edit_photo: false, save_copies: false, picture_source: 'photo' }
			if (readCookie('settings')) {
				settings = JSON.parse(readCookie('settings'))
			}

			let is_authenticated = false
			let user = user_dummy()
			if (readCookie('token')) {
				is_authenticated = true
				user = JSON.parse(readCookie('user'))
			}

			return {
				is_authenticated: is_authenticated,
				user: user,

				cached_email: readCookie('cached_email'),

				settings: settings
			}
		},

		beforeMount: async function () {
			let [is_authenticated, user] = await get_user_info()
			this.is_authenticated = is_authenticated
			this.user = user

			let json = await read_file('user/settings')
			if (json) {
				this.settings = json
				createCookie('settings', JSON.stringify(json))
			}
		},

		methods: {
			/**
			 * Tries to authorize user based on form data.
			 *
			 * Event needs only to prevent default behavior of form on sumbit.
			 *
			 * @param {*} event - form submit event
			 */
			send_data: async function (event = null) {
				if (event) {
					event.stopPropagation()
					event.preventDefault()
				}

				try {
					const form = document.getElementById('login-block')

					const email = form.querySelector('input[name="email"]').value
					const password = form.querySelector('input[name="password"]').value
					const allowed = form.querySelector('input[type="checkbox"]').checked

					// cache email

					createCookie('cached_email', email)

					// send request

					const response = await this.$axios.post(
						API_URL + "/auth/email/login",
						{
							email: email,
							password: password,
						}
					)

					// check response

					const data = response?.data

					if (!data) {
						alert("Возникла непредвиденная ошибка. Попробуйте ещё раз.")
						return
					}

					// save user data

					eraseCookie('cached_email')

					let now = get_now()

					await write_file('user/token', data.token)
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

					if (allowed) {
						await write_file('user/allowed', 'true')

						await write_file('user/data', JSON.stringify({
							m: email,
							p: btoa(btoa(password)) // the most reliable (well, no) encryption
						}))
					}

				} catch (error) {
					if (error.response) {
						if (error.response.data.errors.password === "incorrectPassword") {
							alert("Неверный пароль!")
						}
					} else {
						alert("Возникла непредвиденная ошибка. " + error.toString())
					}
				}

				window.location.reload()

				return false
			},

			/**
			 * Returns back to previous page.
			 */
			go_back: function() {
				window.location.href = '/'
				//window.history.back()
			},

			/**
			 * Removes user token and restarts the page.
			 */
			logout: async function () {
				eraseCookie('token')
				eraseCookie('user')
				await delete_file('user/token')
				await delete_file('user/allowed')
				await delete_file('user/data')
				window.location.reload()
			},

			/**
			 * Sets value to option of settings and saves it.
			 *
			 * @param {*} option - setting to change.
			 * @param {*} value - new value.
			 */
			set_option: async function (option, value) {
				this.settings[option] = value

				await write_file('user/settings', JSON.stringify(this.settings))
			},

			/**
			 * Raises dialog with help message about setting option.
			 *
			 * @param {*} option - option.
			 */
			help_with: function (option) {
				let dialog = document.getElementById('help-dialog')
				if (dialog) {
    				dialog.ariaBusy = true

					let header = dialog.querySelector('#help-header')
					let content = dialog.querySelector('#help-content')

					if (option == 'edit_photo') {
						header.innerText = 'Редактирование фото'
						content.innerHTML = `
						<dl>
							<dt>Да</dt>
							<dd>
								Если выбрано "<dfn>да</dfn>", при загрузке фото будет предлагаться отредактировать
								их в отдельных приложениях.
							</dd>

							<dt>Нет</dt>
							<dd>
								Если выбрано "<dfn>нет</dfn>", фото сразу будет загружено.
							</dd>
						</dl>
						`
					}

					else if (option == 'save_copies') {
						header.innerText = 'Сохранение копий'
						content.innerHTML = `
						<dl>
							<dt>Да</dt>
							<dd>
								Если выбрано "<dfn>да</dfn>", копия фото будет сохранена в галерее. Её удаление,
								редактирование, перемещение и т.п. не повлияют на фото в приложении.
							</dd>

							<dt>Нет</dt>
							<dd>
								Если выбрано "<dfn>нет</dfn>", фото, сделанные в приложении, будут сохранены только
								в нём и не будут доступны нигде. Это не касается фото, загруженных
								из хранилища.
							</dd>
						</dl>
						`
					}

					else if (option == 'picture_source') {
						header.innerText = 'Редактирование фото'
						content.innerHTML = `
						<dl>
							<dt>С камеры</dt>
							<dd>
								При загрузке фотографий будет предложено
								сделать новую фотографию с камеры телефона.
							</dd>

							<dt>Из хранилища</dt>
							<dd>
								При загрузке фотографий будет предложено выбрать
								заранее отснятые фотографии, хранящиеся в телефоне.
							</dd>

							<dt>Каждый раз спрашивать</dt>
							<dd>
								При загрузке фотографий будет предложено выбрать
								между предыдущими двумя вариантами.
							</dd>
						</dl>
						`
					}

					dialog.ariaHidden = false
					dialog.ariaModal = true
					dialog.classList.remove('hidden')

					dialog.showModal()
    				dialog.ariaBusy = false
				}
			},

			/**
			 * Closes help dialog.
			 */
			close_help_dialog: function () {
				let dialog = document.getElementById('help-dialog')
				if (dialog) {
					dialog.close()
					dialog.ariaHidden = true
					dialog.ariaModal = false
					dialog.classList.add('hidden')
				}
			},

			/**
			 * Returns human-readable date from raw one.
			 *
			 * @param {*} raw_date - string, parsable with Date class.
			 */
			process_date: process_date,

			select_from: select_from,
			close_select_dialog: close_select_dialog
		}
	}
</script>

<style>
	#container {
		width: 100%;
	}

	#main.profile, #main.login {
		width: 90%;
		max-width: 500px;
		margin: 20px auto;
	}


	#logo-block {
		margin: 70px auto;
	}

	#logo-block > img {
		display: block;
		margin: auto !important;
	}


	#login-block {
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}

	#login-block > div {
		width: 100%;
		margin-bottom: 20px;
	}

	#login-block input[type='email'], #login-block input[type='password'] {
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border: 1px solid var(--colour-semifront);
		border-radius: 10px;
		background-color: var(--colour-preback);
	}

	#login-block-checkbox {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: flex-start;
		align-items: center;
		gap: 10px;
	}

	#login-block input[type='checkbox'] {
		display: inline;
		box-sizing: border-box;
		width: 30px;
		height: 30px;
		padding: 10px;
		border: 1px solid var(--colour-semifront);
		border-radius: 10px;
		accent-color: var(--colour-btn-back);
		background-color: var(--colour-preback);
	}
	#login-block input[type='checkbox'] + label {
		font-size: 90%;
	}


	#main.profile > * {
		box-sizing: border-box;
		width: 100%;
		padding: 5px 8px;
		margin-bottom: 20px;
	}

	#main.profile > #full-user-info {
		padding: 5px 8px;
	}

	#full-user-info > p {
		margin-bottom: 8px;
	}

	#full-user-info .user-email {
		text-decoration: underline;
	}

	#full-user-info > h2 {
		margin-bottom: 8px;
		color: var(--colour-semifront);
		font-size: 90%;
	}
	#full-user-info > h2 > time {
		color: inherit;
		font-size: inherit;
	}


	#settings > h1 {
		margin-bottom: 10px;
		font-weight: bold;
	}

	#settings > div {
		margin-bottom: 20px;
	}

	.set-section h2 {
		font-size: 80%;
		margin-top: 20px;
	}

	.set-section label {
		font-size: 90%;
	}

	.set-section > menu {
		margin: 10px 0;
		width: 100%;
		list-style: none;
	}

	.set-section > menu > li {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: center;
		gap: 6px;
	}

	.set-section > menu input {
		width: 20px;
		height: 20px;
	}

	.set-section > menu[aria-orientation='horizontal'] {
		display: flex;
		flex-direction: row;
		justify-content: space-around;
		align-items: center;
	}

	.set-section > menu[aria-orientation='vertical'] {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 20px;
		padding-left: 20px;
	}

	.set-section > button {
		margin-left: 20px;
		text-decoration: underline;
		color: var(--colour-view-dark);
	}


	#help-dialog {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		gap: 20px;
		box-sizing: border-box;
		width: 90vw;
		max-width: 600px;
		height: 90vh;
		max-height: 800px;
		padding: 20px 0;
		margin: auto;
		border-radius: 20px;
		background-color: transparent;
		overflow: hidden;
	}
	#help-dialog::backdrop {
		background-color: #000000;
		opacity: .6;
	}

	#help-dialog > section {
		display: flex;
		flex-grow: 1;
		flex-direction: column;
		flex-wrap: nowrap;
		box-sizing: border-box;
		width: 100%;
		height: fit-content;
		padding: 20px 0;
		border: 1px solid var(--colour-front);
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
		background-color: var(--colour-back);
		text-align: center;
	}

	#help-header {
		display: block;
		padding: 10px 0;
		margin-bottom: 10px;
		background-color: var(--colour-header-back);
		color: var(--colour-header-front);
		font-size: 120%;
		text-align: center;
	}

	#help-content {
		box-sizing: border-box;
		width: 100%;
		padding: 0 20px;
		text-align: left;
	}
	#help-content dt {
		font-size: 110%;
		font-weight: bold;
	}
	#help-content dd {
		margin-bottom: 20px;
	}

	#help-dialog > form {
		height: fit-content;
		max-height: 50vh;
		text-align: center;
		overflow: auto;
	}

	#help-dialog > form > button {
		width: 80%;
		margin-bottom: 4px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}


	#main.profile .nav-menu button:first-child {
		background-color: var(--colour-btn-back);
		color: var(--colour-btn-front);
	}

	#main.profile .nav-menu button:last-child {
		background-color: var(--colour-btn-alt-back);
		color: var(--colour-btn-alt-front);
	}

	#main.profile .nav-menu .click-button {
		line-height: 18px;
	}
</style>
