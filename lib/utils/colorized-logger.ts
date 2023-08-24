import { ConsoleLogger, ConsoleLoggerOptions, LogLevel } from '@nestjs/common';
import * as colors from 'colors';
// import * as clc from "cli-color";


/**
 * Modified nestjs logged allowing to specify a custom color to write logs in.
 */
export class ColorizedLogger extends ConsoleLogger {

	constructor(context: string, options: ConsoleLoggerOptions, protected colorOverride?:keyof colors.Color) {
		super(context,options)
	}

	colorize(message:string, logLevel: LogLevel) {
		if(this.colorOverride) {
			const color = colors[this.colorOverride];
			return color(message);
		} else {
			// parent method will use this.getColorByLogLevel to colorize based on used method (log,error,warn,debug)
			return super.colorize(message,logLevel)
		}
    }
	
	printMessagesWithColor(messages:string[], context:string, colorName:keyof colors.Color, writeStreamType=null) {
        const color = colors[colorName];
        messages.forEach(message => {
            const output = color(message);
            const pidMessage = color(`[Nest] ${process.pid}  - `);
            const contextMessage = context ? colors.yellow(`[${context}] `) : '';
            const timestampDiff = (this as any).updateAndGetTimestampDiff();
            const formattedLogLevel = color('CUSTOM'.padStart(7, ' '));
            const computedMessage = `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${contextMessage}${output}${timestampDiff}\n`;
            process[writeStreamType !== null && writeStreamType !== void 0 ? writeStreamType : 'stdout'].write(computedMessage);
        });
    }

}
