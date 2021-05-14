/**
 * @license
 * Copyright 2016-2021 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { flags } from '@oclif/command';
import * as _ from 'lodash';
import Command from '../../command';

import * as cf from '../../utils/common-flags';
import { getBalenaSdk, getVisuals, stripIndent } from '../../utils/lazy';
import { CommandHelp } from '../../utils/oclif-utils';

interface FlagsDef {
	discontinued: boolean;
	help: void;
	json?: boolean;
	verbose?: boolean;
}

export default class DevicesSupportedCmd extends Command {
	public static description = stripIndent`
		List the supported device types (like 'raspberrypi3' or 'intel-nuc').

		List the supported device types (like 'raspberrypi3' or 'intel-nuc').

		The --verbose option may add extra columns/fields to the output. Currently
		this includes the "STATE" column which is DEPRECATED and whose values are one
		of 'new', 'beta', 'released', 'discontinued' or 'N/A' (Not Available).
		'discontinued' device types are only listed if the '--discontinued' option
		is also used, and this option is also DEPRECATED.

		The --json option is recommended when scripting the output of this command,
		because the JSON format is less likely to change and it better represents data
		types like lists and empty strings (for example, the ALIASES column contains a
		list of zero or more values). The 'jq' utility may be helpful in shell scripts
		(https://stedolan.github.io/jq/manual/).
`;
	public static examples = [
		'$ balena devices supported',
		'$ balena devices supported --verbose',
		'$ balena devices supported -vj',
	];

	public static usage = (
		'devices supported ' +
		new CommandHelp({ args: DevicesSupportedCmd.args }).defaultUsage()
	).trim();

	public static flags: flags.Input<FlagsDef> = {
		discontinued: flags.boolean({
			description: 'include "discontinued" device types (DEPRECATED)',
		}),
		help: cf.help,
		json: flags.boolean({
			char: 'j',
			description: 'produce JSON output instead of tabular output',
		}),
		verbose: flags.boolean({
			char: 'v',
			description: 'add extra columns in the tabular output',
		}),
	};

	public async run() {
		const { flags: options } = this.parse<FlagsDef, {}>(DevicesSupportedCmd);
		const [dts, configDTs] = await Promise.all([
			getBalenaSdk().models.deviceType.getAll({
				$expand: { is_of__cpu_architecture: { $select: 'slug' } },
			}),
			getBalenaSdk().models.config.getDeviceTypes(),
		]);
		const configDTsBySlug = _.keyBy(configDTs, (o) => o.slug);
		interface DT {
			slug: string;
			aliases: string[];
			arch: string;
			state: string;
			name: string;
		}
		let deviceTypes: DT[] = [];
		for (const dt of dts) {
			const configDT = configDTsBySlug[dt.slug] || {};
			const aliases = (configDT.aliases || []).filter(
				(alias) => alias !== dt.slug,
			);
			const arch = (dt.is_of__cpu_architecture as any)?.[0]?.slug;
			deviceTypes.push({
				slug: dt.slug,
				aliases: options.json ? aliases : [aliases.join(', ')],
				arch: arch || 'n/a',
				// 'BETA' renamed to 'NEW'
				// https://www.flowdock.com/app/rulemotion/i-cli/threads/1svvyaf8FAZeSdG4dPJc4kHOvJU
				state: (configDT.state || 'N/A').replace('BETA', 'NEW'),
				name: dt.name,
			});
		}
		if (!options.discontinued) {
			deviceTypes = deviceTypes.filter((dt) => dt.state !== 'DISCONTINUED');
		}
		const fields = options.verbose
			? ['slug', 'aliases', 'arch', 'state', 'name']
			: ['slug', 'aliases', 'arch', 'name'];
		deviceTypes = _.sortBy(deviceTypes, fields);
		if (options.json) {
			console.log(JSON.stringify(deviceTypes, null, 4));
		} else {
			const visuals = getVisuals();
			const output = await visuals.table.horizontal(deviceTypes, fields);
			console.log(output);
		}
	}
}
