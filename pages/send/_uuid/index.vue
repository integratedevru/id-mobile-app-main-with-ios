<template>
	<div id="container">
		<main role="main" id="main" class="load">
			<div>
				<div id="loader"></div>
			</div>

			<div id="progress-block">
				<label id="progress-label" for="progress">загрузка... {{ Math.round(progress*10000) / 100 }}%</label>
				<progress id="progress" :value="progress"></progress>
				<label v-html="status_msg"></label>
			</div>

			<div>
				<button type="button" id="close-button" class="click-button" @click="true_close()">прервать и выйти</button>
			</div>
		</main>
	</div>
</template>

<script>
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
	import { get_now, check_connection, get_valid_token } from 'static/common'
	import { debounce } from 'lodash'
	import { API_URL } from '~/static/config';

	export default {
		name: 'IndexPage',

		asyncData: async function({ route }) {
			let uuid = null
			let token = null

			try {
				uuid = route.params.uuid
				token = await get_valid_token()
			}
			catch { return {
				is_not_valid: true,
				progress: 0,
				may_exit: true,
				status_msg: 'необходима авторизация в приложении и подключение к интернету'
			} }

			let criteria = JSON.parse((await Filesystem.readFile({
				path: 'criteria/' + uuid + '/main.txt',
				directory: Directory.Data,
				encoding: Encoding.UTF8
			}))['data'])

			let load_status = JSON.parse((await Filesystem.readFile({
				path: 'criteria/' + uuid + '/load_status.txt',
				directory: Directory.Data,
				encoding: Encoding.UTF8
			}))['data'])

			return {
				is_not_valid: false,
				criteria: criteria,
				load_status: load_status,
				token: token,

				progress: 0,
				status_msg: 'инициализация',
				user_exit: false,
				may_exit: true
			}
		},

		mounted: async function () {
			if (this.is_not_valid) return

			while (!(await check_connection())) {
				this.status_msg = 'нет подключения к интернету'
				if (this.user_exit) window.location.href = '/'
				await new Promise(r => {setTimeout(r, 5000)})
			}

			let stop_endless_loop = this.load_status.pictures_sended.length + 2

			this.status_msg = 'отправка изображений...'

			let check_low_internet = debounce(() => { setTimeout(() => {
				if (this.status_msg.startsWith('отправка изображений')) {
					this.status_msg = 'долгая отправка может быть связана с медленным интернетом'
				}
			}, 100) }, 5000)

			// for each picture
			while (this.load_status.pictures_to_send.length != 0) {
				let iuuid = this.load_status.pictures_to_send[0]

				// load picture
				let img = (await Filesystem.readFile({
					path: `criteria/${this.load_status.uuid}/img-${iuuid}`,
					directory: Directory.Data
				}))['data']

				let ext = (await Filesystem.readFile({
					path: `criteria/${this.load_status.uuid}/img-ext-${iuuid}.txt`,
					directory: Directory.Data,
					encoding: Encoding.UTF8
				}))['data']

				// convert picture
				const binaryData = this.base64ToBinary(img)
				const blob = new Blob([binaryData])
				const newFile = new File([blob], 'filename.'+ext, { type: 'image/'+ext });

				this.may_exit = true

				check_low_internet()

				// send picture
				let result = await this.send_file(newFile)

				this.may_exit = false

				if (result.result) { // if success - update params
					this.load_status.pictures_sended[iuuid] = result.result
					this.load_status.pictures_to_send.shift()

					await this.save_progress()

					let sended = Object.keys(this.load_status.pictures_sended).length
					let total = this.load_status.pictures_count

					this.progress = sended / total
					this.status_msg = `отправка изображений (${sended} / ${total})`

					if (this.user_exit) window.location.href = '/'

					stop_endless_loop--
					if (stop_endless_loop == 0) break
				}
				else { // if fail - notify user and exit
					let reason = result.error ?? 'неизвестная ошибка'

					if (reason == 'Error: Network Error') {
						reason = 'отсутствует подключение к интернету'
					}
					else if (reason == 'Error: Request failed with status code 401') {
						reason = 'необходима авторизация в приложении'
					}
					else if (reason == 'Error: Request failed with status code 415') {
						reason = 'недопустимый формат изображения'
					}
					else if (reason == 'Error: Request failed with status code 422') {
						reason = 'ошибка обработки изображения'
					}
					else if (reason == 'Error: Request failed with status code 500') {
						reason = 'ошибка обработки на сервере'
					}
					else if (reason == 'Error: Request failed with status code 503') {
						reason = 'сервер недоступен - попробуйте позже'
					}

					document.getElementById('loader').style.opacity = 0
					this.status_msg = `ошибка отправки изображения<br /><i>(${reason})</i>`
					this.may_exit = true
					return
				}
			}

			if (!this.load_status.sended) { // if json was not sended

				this.status_msg = 'отправка данных'

				// prepare server-corrented json to send
				let correct_json = {
					category: this.criteria.category,
					indicator: this.criteria.indicator,
					data: this.criteria.data,
					coords: this.criteria.coords,
					city: this.criteria.city,
					pictures: [],
					groups: []
				}

				for (let iuuid of this.criteria.pictures) {
					correct_json.pictures.push(
						this.load_status.pictures_sended[iuuid]
					)
				}

				for (let i = 0; i < this.criteria.group_keys.length; i++) {
					let group = JSON.parse((await Filesystem.readFile({
						path: `criteria/${this.load_status.uuid}/group-${i+1}.txt`,
						directory: Directory.Data,
						encoding: Encoding.UTF8
					}))['data'])

					for (let criterion of group.criteria) {
						if (criterion.type == 'subcriteria') {
							for (let sub_criterion of criterion.subcriteria) {
								let pictures = sub_criterion.pictures
								sub_criterion.pictures = []

								for (let iuuid of pictures) {
									sub_criterion.pictures.push(
										this.load_status.pictures_sended[iuuid]
									)
								}

								if (sub_criterion.pictures.length == 0) {
									delete sub_criterion.pictures
								}
								delete sub_criterion.type
							}
						}

						else if (criterion.type == 'options') {
							let pictures = criterion.pictures
							criterion.pictures = []

							for (let iuuid of pictures) {
								criterion.pictures.push(
									this.load_status.pictures_sended[iuuid]
								)
							}

							if (criterion.pictures.length == 0) {
								delete criterion.pictures
							}

							let options = criterion.options
							let selected_option = criterion.option

							criterion.options = []

							for (let option of options) {
								criterion.options.push({
									name: option,
									selected: option == selected_option
								})
							}

							delete criterion.option
						}

						else if (criterion.type == 'usual') {
							let pictures = criterion.pictures
							criterion.pictures = []

							for (let iuuid of pictures) {
								criterion.pictures.push(
									this.load_status.pictures_sended[iuuid]
								)
							}

							if (criterion.pictures.length == 0) {
								delete criterion.pictures
							}
						}

						delete criterion.type
					}

					correct_json.groups.push(group)
				}

				if (await this.send_json(correct_json)) { // if success - save progress
					this.load_status.sended = true

					await this.save_progress()
				}
				else { // if fail - notify user and exit
					this.status_msg = `ошибка отправки данных`
					document.getElementById('loader').style.opacity = 0
					document.getElementById('close-button').innerText = 'повторить'
				}
			}

			/// if all is right - save ///

			let now = get_now()

			this.criteria.status = 'sended'
			this.criteria.updated = now
			localStorage.setItem(this.load_status.uuid, 'sended ' + now)

			await Filesystem.writeFile({
				path: 'criteria/' + this.load_status.uuid + `/main.txt`,
				data: JSON.stringify(this.criteria),
				directory: Directory.Data,
				encoding: Encoding.UTF8
			})

			// notify user it's end successfully
			document.getElementById('loader').style.opacity = 0
			document.getElementById('progress-label').innerText = 'успешно отправлено'
			document.getElementById('close-button').innerText = 'в меню'
			this.progress = 1
			this.status_msg = '-'
			this.may_exit = true

			await new Promise(r => setTimeout(r, 2000))
			window.location.href='/'
		},

		methods: {
			/**
			 * Tells script to stop and exit when possible (after end of each step).
			 */
			true_close: function () {
				button = document.getElementById('close-button')

				if(this.may_exit) {
					if (button.innerText == 'повторить') window.location.reload()
					else window.location.href='/'
				}

				this.user_exit = true
				button.innerText = 'подождите...'
			},

			base64ToBinary: function (base64String) {
				const binaryString = atob(base64String);
				const byteArray = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					byteArray[i] = binaryString.charCodeAt(i);
				}
				return byteArray;
			},

			/**
			 * Sends file with given content to the server.
			 *
			 * @param {*} file_content - File object.
			 */
			send_file: async function (file_content) {
				try {
					let formData = new FormData()
					formData.append("file", file_content)

					const uploadResponse = await this.$axios.post(
						API_URL + "/files/upload",
						formData,
						{
							timeout: 10000,
							headers: {
								Authorization: "Bearer " + this.token,
								"Content-Type": "multipart/form-data",
								Connection: "keep-alive"
							},
						}
					)

					return { result: uploadResponse.data.id }

				} catch (error) { return { error: error } }
			},

			/**
			 * Sends checklist json with given content to the server.
			 *
			 * @param {*} json_content - json-like object.
			 */
			send_json: async function (json_content) {
				try {
					await this.$axios.post(
						API_URL + "/mobile-app-objects",
						json_content,
						{
							timeout: 10000,
							headers: {
								Authorization: "Bearer " + this.token,
								"Content-Type": "application/json",
								Connection: "close"
							},
						}
					)
					return true
				} catch (error) {
					console.error(error)
					return false
				}
			},

			save_progress: async function () {
				await Filesystem.writeFile({
					path: 'criteria/' + this.load_status.uuid + `/load_status.txt`,
					data: JSON.stringify(this.load_status),
					directory: Directory.Data,
					encoding: Encoding.UTF8
				})
			}
		}
	}
</script>

<style>
	#container {
		width: 100%;
	}

	#main.load {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: center;
		align-content: center;
		align-items: center;
		gap: 100px;
		padding-bottom: 20vh;
		height: 80vh;
	}

	#loader {
		width: 40px;
		height: 40px;
		border-radius: 666px;
		border: 4px solid var(--colour-btn-back);
		clip-path: polygon(
			0% 0%,
			0% 100%,
			50% 50%
		);

		animation: rotating 2s cubic-bezier(1, .5, .3, .5) infinite;
	}

	@keyframes rotating {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
	}

	#progress-block {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: center;
		text-align: center;
	}

	#progress {
		width: 70vw;
		margin: 10px 0 20px 0;
	}
</style>
