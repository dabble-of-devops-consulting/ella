#!/usr/bin/env python
"""
Ella command line interface
"""

import os
import click
from commands.database.database import database
from commands.deposit.deposit import deposit
from commands.analyses.analyses import analyses

SCRIPT_DIR = os.path.abspath(os.path.dirname(__file__))


@click.command('igv-download', help="Download IGV.js data")
@click.argument('target')
def download_igv(target):
    os.system(os.path.join(SCRIPT_DIR, 'commands', 'fetch-igv-data.sh') + ' ' + target)


@click.group()
def cli():
    pass

cli.add_command(database)
cli.add_command(deposit)
cli.add_command(analyses)
cli.add_command(download_igv)

if __name__ == '__main__':
    cli()