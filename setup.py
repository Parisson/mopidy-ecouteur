#!/usr/bin/env python

# Setup script for the `Mopidy-Simple-Webclient' package.
#
# Author: Peter Odding <peter@peterodding.com>
# Last Change: October 19, 2014
# URL: https://github.com/xolox/mopidy-simple-webclient

import os
import setuptools
import re

def get_contents(filename):
    """Get the contents of a file relative to the source distribution directory."""
    root = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(root, filename)) as handle:
        return handle.read()

def get_version(filename):
    """Extract the version number from a Python module."""
    contents = get_contents(filename)
    metadata = dict(re.findall('__([a-z]+)__ = [\'"]([^\'"]+)', contents))
    return metadata['version']

setuptools.setup(
    name='Mopidy-Ecouteur',
    version=get_version('mopidy_ecouteur/__init__.py'),
    description="Very simple web interface for the Mopidy music server designed for the Ecouteur project",
    long_description=get_contents('README.rst'),
    url='https://github.com/parisson/mopidy-ecouteur',
    author='Thomas Fillon',
    author_email='thomas@parisson.com',
    packages=setuptools.find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[
        'Mopidy >= 0.19.4',
        'setuptools',
    ],
    entry_points={
        'mopidy.ext': [
            'ecouteur = mopidy_ecouteur:Extension',
        ],
    },
    classifiers=[
        'Environment :: No Input/Output (Daemon)',
        'Intended Audience :: End Users/Desktop',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 2',
        'Topic :: Multimedia :: Sound/Audio :: Players',
    ])
