<template>
	<div id="container">
		<template v-if="is_not_valid">
			<div id="not-valid">
				<p >К сожалению, возникла ошибка при переходе :(</p>
				<NuxtLink to="/" class="link-button">
					<button type="button" class="click-button">Вернуться на главную</button>
				</NuxtLink>
			</div>
		</template>

		<template v-else>
			<main role="main" id="main" class="view">
				<NuxtLink
					v-if="sorted_uuids.length > 2"
					to="/"
					class="link-button back-button"
					style="box-shadow: none; margin: 10px auto"
					tabindex="-1"
					aria-label="Вернуться на главную"
				>
					<button type="button" class="click-button">меню</button>
				</NuxtLink>

				<section
					v-for="uuid in sorted_uuids"
					class="view-form"
					:id="'form-'+uuid"
					:aria-describedby="'checklist-data-'+uuid"
				>
					<div>
						<h1>{{ forms[uuid].category }}</h1>
					</div>
					<div :id="'checklist-data-' + uuid">
						<img alt="" :src="images[uuid]" aria-hidden="true" />
						<div>
							<h2 v-for="block in forms[uuid].data">{{ block.value }}</h2>
						</div>
					</div>
					<div>
						<p role="status">
							создано: <time :datatime="forms[uuid].created">{{ process_date(forms[uuid].created) }}</time>
							<br />
							изменено: <time :datatime="forms[uuid].updated">{{ process_date(forms[uuid].updated) }}</time>
						</p>
					</div>
					<div>
						<table class="no-sep">
							<tbody>
								<tr v-if="viewing_status == 'filled'" class="filled-menu">
									<td><button type="button" class="click-button" @click="delete_form(uuid)">удалить</button></td>
									<td><button type="button" class="click-button" @click="open_form(uuid)">открыть</button></td>
									<td><button type="button" class="click-button" @click="send_form(uuid)">отправить</button></td>
								</tr>
								<tr v-else>
									<td><button type="button" class="click-button del-btn" @click="delete_form(uuid)">удалить</button></td>
									<td><button type="button" class="click-button" @click="open_form(uuid)">открыть</button></td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<NuxtLink
					to="/"
					class="link-button back-button"
					style="box-shadow: none; margin: 10px auto"
					tabindex="-1"
					aria-label="Вернуться на главную"
				>
					<button type="button" class="click-button">меню</button>
				</NuxtLink>
			</main>
		</template>
	</div>
</template>



<script>
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import { process_date, read_file, write_file } from 'static/common';

	export default {
		name: 'IndexPage',

		asyncData: async function ({ route }) {
			let viewing_status = null

			try {
				viewing_status = route.params.status
			} catch {
				return { is_not_valid: true }
			}

			let main_status = (
				viewing_status == 'draft' ?
					'черновики'
					:
					viewing_status == 'filled' ?
						'заполненные'
						:
						'отправленные'
			)

			let uuids = []
			let forms = {}

			for (let i = 0; i < localStorage.length; i++) {
				let uuid = localStorage.key(i)
				let val = localStorage.getItem(uuid)

				if (val.startsWith(viewing_status)) {
					uuids.push(uuid)
					forms[uuid] = JSON.parse((await Filesystem.readFile({
						path: 'criteria/' + uuid + '/main.txt',
						directory: Directory.Data,
						encoding: Encoding.UTF8
					}))['data'])
				}
			}

			return {
				is_not_valid: false,
				viewing_status: viewing_status,
				main_status: main_status,

				forms: forms,
				sorted_uuids: uuids.sort((a,b) => {
					return new Date(forms[b].updated) - new Date(forms[a].updated)
				}),

				svg_size: 58,
				min_svg_size: 32,

				images: {}
			}
		},

		mounted: async function () {
			let images = {}

			for (let uuid in this.forms) {
				images[uuid] = await this.load_image(uuid, this.forms[uuid].pictures[0])
			}

			this.images = images
		},

		methods: {
			load_image: async function (uuid, iuuid) {
				try {
					let img = (await Filesystem.readFile({
						path: `criteria/${uuid}/img-${iuuid}`,
						directory: Directory.Data
					}))['data']

					let ext = (await Filesystem.readFile({
						path: `criteria/${uuid}/img-ext-${iuuid}.txt`,
						directory: Directory.Data,
						encoding: Encoding.UTF8
					}))['data']

					return `data:image/${ext};base64,` + img
				} catch { return null }
			},

			process_date: process_date,

			open_form: async function (uuid) {
				let last_step = 'begin'

				try {
				last_step = (await Filesystem.readFile({
					path: 'criteria/' + uuid + `/last_step.txt`,
					directory: Directory.Data,
					encoding: Encoding.UTF8
				}))['data']
				} catch {}

				if (last_step == 'begin') {
					window.location.href = '/fill/' + uuid
				}
				else if (last_step == 'end') {
					window.location.href = '/fill/' + uuid + '/summarize'
				}
				else {
					window.location.href = '/fill/' + uuid + '/step/' + last_step
				}
			},

			send_form: async function (uuid) {
				if (!confirm('Отправить?')) return

				/// load criteria ///

				let criteria = await read_file('criteria/' + uuid + '/main.txt')

				/// load groups ///

				let groups = []

				for (let i = 0; i < criteria.group_keys.length; i++) { // for each group
				  groups.push(await read_file('criteria/' + uuid + `/group-${i+1}.txt`))
				}

				/// send pictures ///

				let pictures_to_send = []

				pictures_to_send.push(...criteria.pictures)

				for (let group of groups) {
					for (let criterion of group.criteria) {
						if (criterion.type == 'subcriteria') {
							for(let sub_criterion of criterion.subcriteria) {
								pictures_to_send.push(...sub_criterion.pictures)
							}
						}

						else if (criterion.type == 'options') {
							pictures_to_send.push(...criterion.pictures)
						}

						else if (criterion.type == 'usual') {
							pictures_to_send.push(...criterion.pictures)
						}
					}
				}

				if (await read_file('criteria/' + uuid + `/load_status.txt`) == null) {
                    await write_file('criteria/' + uuid + `/load_status.txt`, JSON.stringify({
                        uuid: uuid,
                        sended: false,
                        pictures_sended: {},
                        pictures_to_send: pictures_to_send,
                        pictures_count: pictures_to_send.length
                    }))
                }

				window.location.href = '/send/' + uuid
			},

			delete_form: async function (uuid) {
				if (confirm('Удалить чек-лист?')) {					// redo
					await Filesystem.rmdir({
						path: `criteria/${uuid}`,
						directory: Directory.Data,
						encoding: Encoding.UTF8,
						recursive: true
					})

					localStorage.removeItem(uuid)

					//document.getElementById('form-'+uuid).remove()

					let index = this.sorted_uuids.indexOf(uuid)
					if (index !== -1) {
						this.sorted_uuids.splice(index, 1)
					}
				}
			}
		}
	}
</script>



<style>
	:root {
		--colour-btn-delete-back: #6E0000;
		--colour-btn-delete-front: #FFFFFF;
		--colour-btn-delete-active: #960000;
	}


	#main.view .view-form {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: center;
		gap: 10px;
		box-sizing: border-box;
		width: 90%;
		max-width: 600px;
		padding: 10px;
		margin: 30px auto;
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
		text-decoration: none;
	}

	#main.view .view-form > div {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 10px;
	}

	#main.view .view-form img {
		width: 100px;
		min-width: 100px;
		height: 100px;
		min-height: 100px;
		border-radius: 10px;
	}

	#main.view .view-form img:not([src]) {
		background-color: var(--colour-semiback);
		position: relative;
	}
	#main.view .view-form img:not([src])::before {
		content: "?";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 50px;
	}

	#main.view .view-form h1 {
		width: 100%;
		text-align: center;
		font-weight: bold;
	}

	#main.view .view-form h2 {
		margin-bottom: 8px;
	}

	#main.view .view-form table {
		width: 100%;
		border-collapse: collapse;
	}

	#main.view .view-form th {
		font-weight: bold;
	}
	#main.view .view-form :is(th, td) {
		color: var(--colour-prefront);
		text-align: center;
		font-size: 90%;
	}
	#main.view .view-form :is(th, td):first-child {
		width: 30%;
	}

	#main.view .view-form .no-sep :is(th, td) {
		padding: 0 4px;
	}
	#main.view .view-form .no-sep :is(th, td) button {
		width: 100%;
		padding-left: 0;
		padding-right: 0;
		text-align: center;
	}

	.filled-menu td:first-child button {
		background-color: #6E0000;
		color: #FFFFFF;
	}
	.filled-menu td:nth-child(2) button {
		background-color: #a99d00;
		color: #FFFFFF;
	}
	.filled-menu td:last-child button {
		background-color: #148476;
		color: #FFFFFF;
	}

	#main.view .view-form table button {
		width: 90%;
	}


	#main.view .del-btn {
		background-color: var(--colour-btn-delete-back) !important;
		color: var(--colour-btn-delete-front) !important;
	}
	#main.view .del-btn:active {
		background-color: var(--colour-btn-delete-active) !important;
	}


	.back-button {
		width: 80%;
		max-width: 700px;
	}
	.back-button > button {
		width: 100%;
	}
</style>
