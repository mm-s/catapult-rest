/*
 * Copyright (c) 2016-2019, Jaguar0625, gimre, BloodyRookie, Tech Bureau, Corp.
 * Copyright (c) 2020-present, Jaguar0625, gimre, BloodyRookie.
 * All rights reserved.
 *
 * This file is part of Catapult.
 *
 * Catapult is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Catapult is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Catapult.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module sockets/finalizationProofCodec */
const catapult = require('catapult-sdk');

const { sizes } = catapult.constants;

const headerSize = 56;

const v2ForkHeight = 215500; // This is the v1/v2 fork height on testnet

const finalizationProofCodec = {
	/**
	 * Parses finalization proof.
	 * @param {object} parser Parser.
	 * @returns {object} Parsed finalization proof.
	 */
	deserialize: parser => {
		const proof = {};

		if (0 === parser.numUnprocessedBytes())
			return undefined;

		// parse header (56 bytes)
		const size = parser.uint32(); // Full packet size
		proof.version = parser.uint32();
		proof.finalizationEpoch = parser.uint32();
		proof.finalizationPoint = parser.uint32();
		proof.height = parser.uint64();
		proof.hash = parser.buffer(sizes.hash256);

		// parse message groups
		proof.messageGroups = [];
		let sizeLeft = size - headerSize;
		while (0 !== sizeLeft) {
			const messageGroupSize = parser.uint32();
			const hashCount = parser.uint32();
			const signatureCount = parser.uint16();
			const messageGroup = {
				signatureSchema: parser.uint16(),
				stage: parser.uint32(),
				height: parser.uint64(),
				hashes: [],
				signatures: []
			};

			const votingKeySize = catapult.utils.uint64.compact(messageGroup.height) > v2ForkHeight
				? sizes.signerPublicKey : sizes.votingKey;

			for (let i = 0; i < hashCount; i++)
				messageGroup.hashes.push(parser.buffer(sizes.hash256));
			for (let i = 0; i < signatureCount; i++) {
				const signature = {
					root: {
						parentPublicKey: parser.buffer(votingKeySize),
						signature: parser.buffer(sizes.signature)
					},
					bottom: {
						parentPublicKey: parser.buffer(votingKeySize),
						signature: parser.buffer(sizes.signature)
					}
				};
				messageGroup.signatures.push(signature);
			}
			proof.messageGroups.push(messageGroup);
			sizeLeft -= messageGroupSize;
		}

		return proof;
	}
};

module.exports = finalizationProofCodec;
